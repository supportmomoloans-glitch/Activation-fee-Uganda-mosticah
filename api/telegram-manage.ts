// Universal Vercel Serverless Function: telegram-manage
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

  try {
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

    if (!botToken) {
      const msg = { ok: false, message: 'TELEGRAM_BOT_TOKEN is not configured.' };
      return res.status ? res.status(200).json(msg) : res.end(JSON.stringify(msg));
    }

    const action = req.query?.action || 'status';

    if (action === 'delete' || action === 'delete_webhook') {
      const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`, {
        method: 'POST',
      });
      const delData = await delRes.json();
      return res.status ? res.status(200).json({ ok: true, action: 'deleteWebhook', result: delData }) : res.end(JSON.stringify({ ok: true, action: 'deleteWebhook', result: delData }));
    }

    // Default: Check status
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const infoData = await infoRes.json();
    return res.status ? res.status(200).json({ ok: true, webhookInfo: infoData }) : res.end(JSON.stringify({ ok: true, webhookInfo: infoData }));
  } catch (error: any) {
    const errObj = { ok: false, error: error.message || 'Error managing telegram' };
    return res.status ? res.status(200).json(errObj) : res.end(JSON.stringify(errObj));
  }
}
