// ─── Ban / Unban Commands ───

import type { BotContext } from '../../types';

export async function handleBan(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/).slice(1);

  if (parts.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/ban id1 id2 ...</code>', { parse_mode: 'HTML' });
    return;
  }

  let count = 0;
  for (const idStr of parts) {
    const userId = parseInt(idStr, 10);
    if (isNaN(userId)) continue;
    if (ctx.settings.admins.includes(userId)) continue;

    if (!(await ctx.db.presentUser(userId))) {
      await ctx.db.addUser(userId, true);
    } else {
      await ctx.db.banUser(userId);
    }
    count++;
  }

  await ctx.api.sendMessage(msg.chat.id, `<b>${count} users have been banned!</b>`, { parse_mode: 'HTML' });
}

export async function handleUnban(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/).slice(1);

  if (parts.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/unban id1 id2 ...</code>', { parse_mode: 'HTML' });
    return;
  }

  let count = 0;
  for (const idStr of parts) {
    const userId = parseInt(idStr, 10);
    if (isNaN(userId)) continue;

    if (!(await ctx.db.presentUser(userId))) {
      await ctx.db.addUser(userId);
    } else {
      await ctx.db.unbanUser(userId);
    }
    count++;
  }

  await ctx.api.sendMessage(msg.chat.id, `<b>${count} users have been unbanned!</b>`, { parse_mode: 'HTML' });
}
