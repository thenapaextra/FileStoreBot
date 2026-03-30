// ─── Auth Middleware ───

import type { BotContext} from '../../types';

export function isAdmin(ctx: BotContext, userId: number): boolean {
  return ctx.settings.admins.includes(userId);
}

export function isOwner(ctx: BotContext, userId: number): boolean {
  return userId === ctx.settings.owner_id;
}

export async function checkBan(ctx: BotContext, userId: number): Promise<boolean> {
  return ctx.db.isBanned(userId);
}
