// ─── Auto-Delete Cron Processor ───

import { Telegram } from '../../telegram';
import { Database } from '../../db/d1';
import { logger } from '../../utils/logger';
import type { Env } from '../../types';

export async function processAutoDeleteCron(env: Env) {
  const db = new Database(env.DB, env.SESSION_NAME || 'bot 1');
  const api = new Telegram(env.BOT_TOKEN);

  const expired = await db.getExpiredDeletions();
  if (expired.length === 0) return;

  logger.info('autoDel', `Processing ${expired.length} expired deletion tasks`);

  for (const task of expired) {
    try {
      for (const msgId of task.message_ids) {
        await api.deleteMessage(task.chat_id, msgId);
      }

      const buttonUrl = task.link_param
        ? `https://t.me/${(await api.getMe()).username}?start=${task.link_param}`
        : null;

      let finalText = '<b>Pʀᴇᴠɪᴏᴜs Mᴇssᴀɢᴇ ᴡᴀs Dᴇʟᴇᴛᴇᴅ 🗑</b>';
      let keyboard: any = undefined;

      if (buttonUrl) {
        finalText += `\n<blockquote><b>Iғ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ɢᴇᴛ ᴛʜᴇ ғɪʟᴇs ᴀɢᴀɪɴ, ᴛʜᴇɴ ᴄʟɪᴄᴋ:<a href="${buttonUrl}">⭕️ Cʟɪᴄᴋ Hᴇʀᴇ</a> ʙᴜᴛᴛᴏɴ ʙᴇʟᴏᴡ.</blockquote></b>`;
        keyboard = { inline_keyboard: [
          [{ text: '⭕️ Cʟɪᴄᴋ Hᴇʀᴇ', url: buttonUrl }, { text: 'Cʟᴏꜱᴇ ✖️', callback_data: 'close' }],
        ]};
      }

      await api.sendMessage(task.chat_id, finalText, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        disable_web_page_preview: true,
      });
    } catch (e: any) {
      logger.warn('autoDel', `Failed to process deletion for chat ${task.chat_id}: ${e.message}`);
    }

    await db.removeDeletion(task._id);
  }
}
