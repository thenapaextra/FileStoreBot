// ─── /users Command ───

import type { BotContext } from '../../types';

export async function handleUsers(ctx: BotContext) {
  const msg = ctx.update.message!;
  const totalUsers = await ctx.db.fullUserbase();
  await ctx.api.sendMessage(msg.chat.id, `<b>${totalUsers.length} Users are using this bot currently!</b>`, { parse_mode: 'HTML' });
}
