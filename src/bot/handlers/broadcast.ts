import type { BotContext, Env } from '../../types';
import { Telegram } from '../../telegram';
import { Database } from '../../db/d1';
import { logger } from '../../utils/logger';

const BATCH_SIZE = 50;

// ─── /broadcast command (queues the task) ───

export async function handleBroadcast(ctx: BotContext) {
  const msg = ctx.update.message!;

  if (!msg.reply_to_message) {
    await ctx.api.sendMessage(msg.chat.id,
      '<blockquote><b>Reply to a message to broadcast it.</b></blockquote>\n\n<b>Usage:</b> Reply to any message with <code>/broadcast</code>',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const statusMsg = await ctx.api.sendMessage(msg.chat.id,
    '<blockquote><i>📡 Broadcasting queued... Processing will start shortly.</i></blockquote>',
    { parse_mode: 'HTML' }
  );

  await ctx.db.createBroadcast(
    msg.chat.id,
    msg.reply_to_message.chat.id,
    msg.reply_to_message.message_id,
    statusMsg.message_id
  );

  await ctx.api.editMessageText(msg.chat.id, statusMsg.message_id,
    '<blockquote><i>📡 Broadcast queued! Processing in batches via cron...</i></blockquote>\n\n<i>Status will be updated automatically.</i>',
    { parse_mode: 'HTML' }
  );
}

// ─── Cron processor: processes broadcast tasks in batches ───

export async function processBroadcastCron(env: Env) {
  const db = new Database(env.DB, env.SESSION_NAME || 'bot 1');
  const api = new Telegram(env.BOT_TOKEN);

  const task = await db.getPendingBroadcast();
  if (!task) return;

  if (task.status === 'pending') {
    await db.updateBroadcast(task._id, { status: 'running' });
  }

  const users = await db.getUsersAfter(task.last_user_id || 0, BATCH_SIZE);

  if (users.length === 0) {
    await db.updateBroadcast(task._id, { status: 'completed' });

    const status = `<blockquote><b><u>Broadcast Completed</u></b></blockquote>\n<blockquote expandable><b>Total Users :</b> <code>${task.total || 0}</code>\n<b>Successful :</b> <code>${task.successful || 0}</code>\n<b>Blocked Users :</b> <code>${task.blocked || 0}</code>\n<b>Deleted Accounts :</b> <code>${task.deleted || 0}</code>\n<b>Unsuccessful :</b> <code>${task.unsuccessful || 0}</code></blockquote>`;

    try {
      await api.editMessageText(task.admin_chat_id, task.status_message_id, status, { parse_mode: 'HTML' });
    } catch (e: any) {
      logger.warn('broadcast', `Failed to update final status: ${e.message}`);
    }
    return;
  }

  let successful = 0, blocked = 0, deleted = 0, unsuccessful = 0;

  for (const userId of users) {
    try {
      await api.copyMessage(userId, task.source_chat_id, task.source_message_id);
      successful++;
    } catch (e: any) {
      const errMsg = e.message?.toLowerCase() || '';
      if (errMsg.includes('blocked') || errMsg.includes('user is deactivated')) {
        await db.delUser(userId);
        if (errMsg.includes('blocked')) blocked++;
        else deleted++;
      } else {
        unsuccessful++;
      }
    }
  }

  const lastUserId = users[users.length - 1];

  await db.incrementBroadcastCounters(task._id, { successful, blocked, deleted, unsuccessful, total: users.length });
  await db.updateBroadcast(task._id, { last_user_id: lastUserId });

  const currentTotal = (task.total || 0) + users.length;
  const currentSuccess = (task.successful || 0) + successful;
  try {
    await api.editMessageText(task.admin_chat_id, task.status_message_id,
      `<blockquote><i>📡 Broadcasting in progress...</i></blockquote>\n\n<b>Processed:</b> <code>${currentTotal}</code>\n<b>Successful:</b> <code>${currentSuccess}</code>\n<b>Remaining:</b> Processing...`,
      { parse_mode: 'HTML' }
    );
  } catch {}

  logger.info('broadcast', `Processed batch: ${users.length} users, ${successful} success, last_id=${lastUserId}`);
}
