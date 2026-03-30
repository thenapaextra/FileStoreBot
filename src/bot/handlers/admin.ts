// ─── Admin Management ───

import type { BotContext } from '../../types';
import { isOwner } from '../middleware/auth';
import { editOrSendSettings } from './settings';

export async function handleAdminsPanel(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  if (!isOwner(ctx, query.from.id)) {
    await ctx.api.answerCallbackQuery(query.id, { text: 'This can only be used by owner.', show_alert: true });
    return;
  }
  await ctx.api.answerCallbackQuery(query.id);

  const adminList = ctx.settings.admins.map(a => `<code>${a}</code>`).join(', ');
  const msg = `<blockquote><b>Admin Settings:</b></blockquote>\n<b>Admin User IDs:</b> ${adminList}\n\n<i>Use commands or buttons below:</i>\n<code>/addadmin id1 id2 ...</code>\n<code>/rmadmin id1 id2 ...</code>`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: 'ᴀᴅᴅ ᴀᴅᴍɪɴ', callback_data: 'add_admin' }, { text: 'ʀᴇᴍᴏᴠᴇ ᴀᴅᴍɪɴ', callback_data: 'rm_admin' }],
    [{ text: '◂ ʙᴀᴄᴋ', callback_data: 'settings_pg1' }],
  ]});
}

// ─── Add Admin Button (pending action) ───

export async function handleAddAdminButton(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await ctx.db.setPendingAction(query.from.id, 'add_admin');

  const msg = 'Send user ids separated by a space in the next 90 seconds!\nEg: <code>838278682 83622928 82789928</code>';
  await editOrSendSettings(ctx, msg, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'admins' }]] });
}

export async function handleRmAdminButton(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await ctx.db.setPendingAction(query.from.id, 'rm_admin');

  const msg = 'Send user ids separated by a space in the next 90 seconds!\nEg: <code>838278682 83622928 82789928</code>';
  await editOrSendSettings(ctx, msg, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'admins' }]] });
}

// ─── Process pending admin actions ───

export async function processAddAdmin(ctx: BotContext) {
  const msg = ctx.update.message!;
  const ids = (msg.text || '').trim().split(/\s+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));

  for (const id of ids) {
    if (!ctx.settings.admins.includes(id)) {
      ctx.settings.admins.push(id);
    }
  }

  await ctx.db.saveSettings({
    admins: ctx.settings.admins, messages: ctx.settings.messages,
    auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn,
    reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases,
  });

  await ctx.api.sendMessage(msg.chat.id,
    `<b>${ids.length} admin ${ids.length === 1 ? 'id' : 'ids'} have been promoted!</b>`,
    { parse_mode: 'HTML' }
  );
}

export async function processRmAdmin(ctx: BotContext) {
  const msg = ctx.update.message!;
  const ids = (msg.text || '').trim().split(/\s+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
  let removed = 0;

  for (const id of ids) {
    if (id === ctx.settings.owner_id) {
      await ctx.api.sendMessage(msg.chat.id, 'You cannot remove the owner from the admin list!');
      continue;
    }
    const idx = ctx.settings.admins.indexOf(id);
    if (idx !== -1) {
      ctx.settings.admins.splice(idx, 1);
      removed++;
    }
  }

  await ctx.db.saveSettings({
    admins: ctx.settings.admins, messages: ctx.settings.messages,
    auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn,
    reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases,
  });

  await ctx.api.sendMessage(msg.chat.id,
    `<b>${removed} admin ${removed === 1 ? 'id' : 'ids'} have been removed!</b>`,
    { parse_mode: 'HTML' }
  );
}

// ─── Command-based admin management ───

export async function handleAddAdminCommand(ctx: BotContext) {
  const msg = ctx.update.message!;
  const idsStr = (msg.text || '').split(/\s+/).slice(1);
  if (idsStr.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/addadmin id1 id2 ...</code>', { parse_mode: 'HTML' });
    return;
  }
  ctx.update.message!.text = idsStr.join(' ');
  await processAddAdmin(ctx);
}

export async function handleRmAdminCommand(ctx: BotContext) {
  const msg = ctx.update.message!;
  const idsStr = (msg.text || '').split(/\s+/).slice(1);
  if (idsStr.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/rmadmin id1 id2 ...</code>', { parse_mode: 'HTML' });
    return;
  }
  ctx.update.message!.text = idsStr.join(' ');
  await processRmAdmin(ctx);
}
