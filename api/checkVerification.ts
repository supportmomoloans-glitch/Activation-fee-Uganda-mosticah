// Universal Vercel Serverless Function: checkVerification
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
    let input = req.body;
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input);
      } catch {
        input = {};
      }
    }
    input = input || {};
    const sessionId = input.sessionId || req.query?.sessionId;

    if (!sessionId) {
      return res.status ? res.status(200).json({ status: 'correct' }) : res.end(JSON.stringify({ status: 'correct' }));
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

    if (!botToken) {
      return res.status ? res.status(200).json({ status: 'correct' }) : res.end(JSON.stringify({ status: 'correct' }));
    }

    const fetchTelegramUpdates = async () => {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=-50&allowed_updates=${encodeURIComponent(
        '["callback_query","message"]'
      )}`;
      return await fetch(url);
    };

    let tgRes = await fetchTelegramUpdates();

    // If 409 webhook conflict, remove webhook and retry once
    if (tgRes.status === 409) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`, {
          method: 'POST',
        });
        tgRes = await fetchTelegramUpdates();
      } catch {
        // Continue
      }
    }

    if (!tgRes.ok) {
      return res.status ? res.status(200).json({ status: 'pending' }) : res.end(JSON.stringify({ status: 'pending' }));
    }

    const data = (await tgRes.json()) as any;
    if (data && data.ok && Array.isArray(data.result)) {
      for (let i = data.result.length - 1; i >= 0; i--) {
        const update = data.result[i];
        const cbData = update.callback_query?.data;
        if (cbData && (cbData.includes(sessionId) || cbData.endsWith(sessionId))) {
          const isCorrect = cbData.startsWith('correct_');
          const isIncorrect = cbData.startsWith('incorrect_');

          if (isCorrect || isIncorrect) {
            const finalStatus = isCorrect ? 'correct' : 'incorrect';

            // Answer callback toast
            if (update.callback_query?.id) {
              try {
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    callback_query_id: update.callback_query.id,
                    text: isCorrect ? 'Verified: Approved ✅' : 'Verified: Rejected ❌',
                  }),
                });
              } catch (_) {}
            }

            // Edit message text
            if (update.callback_query?.message) {
              try {
                const orig = update.callback_query.message.text || '';
                const msgChatId = update.callback_query.message.chat?.id || chatId;
                const msgId = update.callback_query.message.message_id;
                const banner = isCorrect ? '\n\n✅ VERDICT: APPROVED' : '\n\n❌ VERDICT: REJECTED';

                await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: msgChatId,
                    message_id: msgId,
                    text: orig + banner,
                    reply_markup: { inline_keyboard: [] },
                  }),
                });
              } catch (_) {}
            }

            return res.status ? res.status(200).json({ status: finalStatus }) : res.end(JSON.stringify({ status: finalStatus }));
          }
        }
      }
    }

    return res.status ? res.status(200).json({ status: 'pending' }) : res.end(JSON.stringify({ status: 'pending' }));
  } catch (error: any) {
    console.error('[Telegram checkVerification Error]:', error);
    return res.status ? res.status(200).json({ status: 'pending' }) : res.end(JSON.stringify({ status: 'pending' }));
  }
}
