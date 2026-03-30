import type { BotContext } from '../../types';
import { editOrSendSettings, handleDbSettings, handleAutoDelSettings, handleTexts, handlePhotos } from './settings';

// ─── DB Prompts ───

export async function handleDbActionPrompts(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const action = query.data || '';
  
  const prompts: Record<string, string> = {
    'add_db': 'Send the Channel ID for the new <b>Secondary</b> database.',
    'rm_db': 'Send the Channel ID of the database to remove.',
    'set_primary_db': 'Send the Channel ID to set as <b>Primary</b>.\n(Must already be a secondary channel)',
    'set_backup_db': 'Send the Channel ID to set as <b>Backup</b>.'
  };

  await ctx.db.setPendingAction(query.from.id, 'db_action', { action });
  await editOrSendSettings(ctx, `<blockquote>${prompts[action]}</blockquote>`, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'db_settings' }]] }, "https://graph.org/file/7d25f187b033c8d31f29b-b2310e1fd72d0aca4c.jpg");
}

export async function processDbAction(ctx: BotContext, data: any) {
  const msg = ctx.update.message!;
  const action = data.action;
  const channelId = parseInt((msg.text || '').trim(), 10);

  if (isNaN(channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid ID format.</b> Please send a correct Channel ID.', { parse_mode: 'HTML' });
    return;
  }
  
  const db = ctx.settings.databases;
  let reply = '';

  if (action === 'add_db') {
    if (db.secondary.includes(channelId)) reply = 'This channel is already a secondary database.';
    else { db.secondary.push(channelId); reply = `✅ Channel <code>${channelId}</code> added as a secondary database.`; }
  } else if (action === 'rm_db') {
    if (db.primary === channelId) reply = 'Cannot remove the primary database. Set a new primary first.';
    else if (db.backup === channelId) { db.backup = null; reply = `✅ Channel <code>${channelId}</code> has been removed.`; }
    else if (db.secondary.includes(channelId)) { db.secondary = db.secondary.filter(c => c !== channelId); reply = `✅ Channel <code>${channelId}</code> has been removed.`; }
    else reply = '❌ Channel not found in any database configuration.';
  } else if (action === 'set_primary_db') {
    if (!db.secondary.includes(channelId)) reply = 'This channel must be a secondary database first.';
    else {
      const oldPrimary = db.primary;
      db.primary = channelId;
      db.secondary = db.secondary.filter(c => c !== channelId);
      if (oldPrimary) db.secondary.push(oldPrimary);
      reply = `✅ <code>${channelId}</code> is now the primary database.`;
    }
  } else if (action === 'set_backup_db') {
    db.backup = channelId;
    reply = `✅ <code>${channelId}</code> is now the backup database.`;
  }

  ctx.settings.all_db_ids = [db.primary, ...db.secondary].filter(Boolean) as number[];
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  
  await ctx.api.sendMessage(msg.chat.id, reply, { parse_mode: 'HTML' });
}

// ─── Auto Del Prompts ───

export async function handleSetAutoDelPrompt(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await ctx.db.setPendingAction(query.from.id, 'set_auto_del');
  await editOrSendSettings(ctx, `<blockquote>Send the auto delete timer in seconds (e.g. 600 for 10 minutes).\nSend 0 to disable.</blockquote>`, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'auto_del' }]] });
}

export async function processSetAutoDel(ctx: BotContext) {
  const msg = ctx.update.message!;
  const seconds = parseInt((msg.text || '').trim(), 10);
  if (isNaN(seconds) || seconds < 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid value. Please provide a non-negative number.</b>', { parse_mode: 'HTML' });
    return;
  }
  ctx.settings.auto_del = seconds;
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ Auto-delete timer set to <b>${seconds === 0 ? 'Disabled' : seconds + ' seconds'}</b>`, { parse_mode: 'HTML' });
}

// ─── Texts Prompts ───

export async function handleSetTextPrompt(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const type = (query.data || '').replace('set_text_', ''); // start, fsub, about, help, reply
  await ctx.db.setPendingAction(query.from.id, 'set_text', { type });
  await editOrSendSettings(ctx, `<blockquote>Send the new text for <b>${type.toUpperCase()}</b>.</blockquote>`, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'texts' }]] });
}

export async function processSetText(ctx: BotContext, data: any) {
  const msg = ctx.update.message!;
  const type = data.type.toUpperCase();
  const value = msg.text;
  if (!value) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Please send a text message.</b>', { parse_mode: 'HTML' });
    return;
  }
  ctx.settings.messages[type] = value;
  if (type === 'REPLY') ctx.settings.reply_text = value;
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ <b>${type}</b> text updated!`, { parse_mode: 'HTML' });
}

// ─── Photos Prompts ───

export async function handleSetPhotoPrompt(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const type = (query.data || '').replace('set_photo_', ''); // start, fsub
  await ctx.db.setPendingAction(query.from.id, 'set_photo', { type });
  await editOrSendSettings(ctx, `<blockquote>Send the new Photo URL for <b>${type.toUpperCase()}</b>.</blockquote>`, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'photos' }]] });
}

export async function processSetPhoto(ctx: BotContext, data: any) {
  const msg = ctx.update.message!;
  const type = data.type.toLowerCase();
  const url = (msg.text || '').trim();
  if (!url) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Please send a valid URL.</b>', { parse_mode: 'HTML' });
    return;
  }
  const keyMap: Record<string, string> = { start: 'START_PHOTO', fsub: 'FSUB_PHOTO' };
  const key = keyMap[type];
  ctx.settings.messages[key] = url;
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ <b>${key.replace('_', ' ')}</b> updated!`, { parse_mode: 'HTML' });
}
