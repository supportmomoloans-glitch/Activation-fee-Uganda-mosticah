// Universal Vercel Serverless / Node.js Health & Diagnostics Endpoint
export default async function handler(req: any, res: any) {
  try {
    // Configure CORS safely
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

    let botInfo: any = null;
    let botConnected = false;
    let webhookInfo: any = null;
    let connectionError: string | null = null;

    if (botToken) {
      try {
        const getMeRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const getMeData = (await getMeRes.json()) as any;
        if (getMeData && getMeData.ok && getMeData.result) {
          botConnected = true;
          botInfo = {
            id: getMeData.result.id,
            username: getMeData.result.username ? `@${getMeData.result.username}` : null,
            firstName: getMeData.result.first_name,
            isBot: getMeData.result.is_bot,
          };
        } else {
          connectionError = getMeData?.description || 'Invalid bot token response';
        }
      } catch (err: any) {
        connectionError = err.message || 'Failed to reach api.telegram.org';
      }

      try {
        const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const webhookData = (await webhookRes.json()) as any;
        if (webhookData && webhookData.ok && webhookData.result) {
          webhookInfo = {
            url: webhookData.result.url || '(none - getUpdates polling mode)',
            hasCustomCertificate: webhookData.result.has_custom_certificate,
            pendingUpdateCount: webhookData.result.pending_update_count || 0,
            lastErrorMessage: webhookData.result.last_error_message || null,
          };
        }
      } catch {
        // Non-blocking
      }
    }

    const payload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'vercel-production' : 'development-server',
      configuration: {
        botTokenConfigured: Boolean(botToken),
        chatIdConfigured: Boolean(chatId),
        chatIdMasked: chatId ? `***${chatId.slice(-4)}` : 'not_configured',
      },
      telegramBot: {
        connected: botConnected,
        bot: botInfo,
        error: connectionError,
      },
      webhook: webhookInfo,
    };

    if (res.status && typeof res.status === 'function') {
      return res.status(200).json(payload);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(payload));
    }
  } catch (error: any) {
    const errorPayload = {
      status: 'error',
      message: error.message || 'Internal health check error',
    };
    if (res.status && typeof res.status === 'function') {
      return res.status(200).json(errorPayload);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(errorPayload));
    }
  }
}
