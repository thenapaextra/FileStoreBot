// ─── Settings Menu (3 pages of inline buttons) ───

import type { BotContext } from '../../types';

export async function editOrSendSettings(ctx: BotContext, text: string, reply_markup: any, customPhoto?: string) {
  const query = ctx.update.callback_query;
  const msgObj = query ? query.message! : ctx.update.message!;
  const chatId = msgObj.chat.id;
  const editMsgId = query ? msgObj.message_id : undefined;
  const isOriginalMedia = !!msgObj.photo || !!msgObj.document || !!msgObj.video;

  const photo = customPhoto !== undefined ? customPhoto : ctx.settings.messages.START_PHOTO;

  if (photo) {
    if (editMsgId) {
      if (isOriginalMedia) {
        await ctx.api.request('editMessageMedia', {
          chat_id: chatId,
          message_id: editMsgId,
          media: { type: 'photo', media: photo, caption: text, parse_mode: 'HTML' },
          reply_markup
        }).catch(async () => {
          await ctx.api.deleteMessage(chatId, editMsgId).catch(() => {});
          await ctx.api.sendPhoto(chatId, photo, { caption: text, parse_mode: 'HTML', reply_markup });
        });
      } else {
        await ctx.api.deleteMessage(chatId, editMsgId).catch(() => {});
        await ctx.api.sendPhoto(chatId, photo, { caption: text, parse_mode: 'HTML', reply_markup });
      }
    } else {
      await ctx.api.sendPhoto(chatId, photo, { caption: text, parse_mode: 'HTML', reply_markup });
    }
  } else {
    // No photo setting in bot
    if (editMsgId) {
      if (isOriginalMedia) {
        await ctx.api.deleteMessage(chatId, editMsgId).catch(() => {});
        await ctx.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
      } else {
        await ctx.api.editMessageText(chatId, editMsgId, text, { parse_mode: 'HTML', reply_markup }).catch(async () => {
          await ctx.api.deleteMessage(chatId, editMsgId).catch(() => {});
          await ctx.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
        });
      }
    } else {
      await ctx.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
    }
  }
}

export async function handleSettingsCommand(ctx: BotContext) {
  await showSettingsPage1(ctx);
}

export async function handleSettingsCallback(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await showSettingsPage1(ctx);
}

async function showSettingsPage1(ctx: BotContext) {
  const msg = `<blockquote><b>⚙️ ʙᴏᴛ ꜱᴇᴛᴛɪɴɢꜱ (ᴘᴀɢᴇ 1/3)</b></blockquote>\nᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ᴍᴀɴᴀɢᴇ ᴛʜᴇ ʙᴏᴛ'ꜱ ᴄᴏʀᴇ ꜰᴇᴀᴛᴜʀᴇꜱ.`;
  const reply_markup = { inline_keyboard: [
    [{ text: 'ꜰꜱᴜʙ ᴄʜᴀɴɴᴇʟꜱ', callback_data: 'fsub' }, { text: 'ᴅʙ ᴄʜᴀɴɴᴇʟꜱ', callback_data: 'db_settings' }],
    [{ text: 'ᴀᴅᴍɪɴꜱ', callback_data: 'admins' }, { text: 'ᴀᴜᴛᴏ ᴅᴇʟᴇᴛᴇ', callback_data: 'auto_del' }],
    [{ text: 'ʜᴏᴍᴇ', callback_data: 'home' }, { text: '›› ɴᴇxᴛ', callback_data: 'settings_pg2' }],
  ]};

  await editOrSendSettings(ctx, msg, reply_markup);
}

export async function handleSettingsPage1(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await showSettingsPage1(ctx);
}

export async function handleSettingsPage2(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const msg = `<blockquote><b>⚙️ ʙᴏᴛ ꜱᴇᴛᴛɪɴɢꜱ (ᴘᴀɢᴇ 2/3)</b></blockquote>\nᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ᴍᴀɴᴀɢᴇ ᴛʜᴇ ʙᴏᴛ'ꜱ ᴄᴏʀᴇ ꜰᴇᴀᴛᴜʀᴇꜱ.`;
  const reply_markup = { inline_keyboard: [
    [{ text: '📁 Fɪʟᴇs Sᴇᴛᴛɪɴɢs', callback_data: 'file_settings' }],
    [{ text: 'ᴘʜᴏᴛᴏꜱ', callback_data: 'photos' }, { text: 'ᴛᴇxᴛꜱ', callback_data: 'texts' }],
    [{ text: '🔗 ꜱʜᴏʀᴛɴᴇʀ', callback_data: 'shortner' }, { text: '💰 ᴄʀᴇᴅɪᴛ ꜱʏꜱᴛᴇᴍ', callback_data: 'credit_settings' }],
    [{ text: '✅ ᴀᴜᴛᴏ ᴀᴘᴘʀᴏᴠᴇ', callback_data: 'auto_approve' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg1' }, { text: '›› ɴᴇxᴛ', callback_data: 'settings_pg3' }],
  ]};

  await editOrSendSettings(ctx, msg, reply_markup);
}

export async function handleSettingsPage3(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const linkChannels = await ctx.db.getLinkChannels();
  const channelCount = linkChannels.length;
  const statusText = channelCount > 0 ? '✓ 𝙰𝚌𝚝𝚒𝚟𝚎' : '✗ 𝙽𝚘 𝚌𝚑𝚊𝚗𝚗𝚎𝚕 𝚊𝚍𝚍𝚎𝚍';

  const msg = `<blockquote><b>⚙️ ʙᴏᴛ ꜱᴇᴛᴛɪɴɢꜱ (ᴘᴀɢᴇ 3/3)</b></blockquote>\n\n<b>ʟɪɴᴋ ꜱʜᴀʀɪɴɢ ꜱʏꜱᴛᴇᴍ</b>\n\n<b>ꜱᴛᴀᴛᴜꜱ:</b> ${statusText}\n<b>ᴄᴏɴꜰɪɢᴜʀᴇᴅ ᴄʜᴀɴɴᴇʟꜱ:</b> ${channelCount}`;

  const reply_markup = { inline_keyboard: [
    [{ text: 'ᴍᴀɴᴀɢᴇ ᴄʜᴀɴɴᴇʟꜱ', callback_data: 'link_manage' }, { text: 'ɢᴇɴᴇʀᴀᴛᴇ ʟɪɴᴋꜱ', callback_data: 'link_generate' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg2' }, { text: 'ʜᴏᴍᴇ', callback_data: 'home' }],
  ]};

  await editOrSendSettings(ctx, msg, reply_markup);
}

// ─── File Settings Panel ───

export async function handleFileSettings(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const protectText = ctx.settings.protect ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ';
  const hideText = ctx.settings.hide_caption ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ';
  const btnText = ctx.settings.channel_button_enabled ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ';

  const msg = `<blockquote><b>📁 ꜰɪʟᴇ ꜱᴇᴛᴛɪɴɢꜱ</b></blockquote>\n\n<b>›› ᴘʀᴏᴛᴇᴄᴛ ᴄᴏɴᴛᴇɴᴛ:</b> ${protectText}\n<b>›› ʜɪᴅᴇ ᴄᴀᴘᴛɪᴏɴ:</b> ${hideText}\n<b>›› ᴄʜᴀɴɴᴇʟ ʙᴜᴛᴛᴏɴ:</b> ${btnText}`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: `ᴘʀᴏᴛᴇᴄᴛ: ${protectText}`, callback_data: 'toggle_protect' }, { text: `ᴄᴀᴘᴛɪᴏɴ: ${hideText}`, callback_data: 'toggle_caption' }],
    [{ text: `ᴄʜ ʙᴜᴛᴛᴏɴ: ${btnText}`, callback_data: 'toggle_ch_btn' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg2' }],
  ]});
}

export async function handleToggleProtect(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.protect = !ctx.settings.protect;
  await ctx.db.saveBotSetting('protect_content', ctx.settings.protect);
  await ctx.api.answerCallbackQuery(query.id, { text: `Content Protection ${ctx.settings.protect ? 'Enabled' : 'Disabled'}` });
  await handleFileSettings(ctx);
}

export async function handleToggleCaption(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.hide_caption = !ctx.settings.hide_caption;
  await ctx.db.saveBotSetting('hide_caption', ctx.settings.hide_caption);
  await ctx.api.answerCallbackQuery(query.id, { text: `Hide Caption ${ctx.settings.hide_caption ? 'Enabled' : 'Disabled'}` });
  await handleFileSettings(ctx);
}

export async function handleToggleChannelBtn(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.channel_button_enabled = !ctx.settings.channel_button_enabled;
  await ctx.db.saveBotSetting('channel_button_enabled', ctx.settings.channel_button_enabled);
  await ctx.api.answerCallbackQuery(query.id, { text: `Channel Button ${ctx.settings.channel_button_enabled ? 'Enabled' : 'Disabled'}` });
  await handleFileSettings(ctx);
}

// ─── Photos Panel ───

export async function handlePhotos(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const hasStart = ctx.settings.messages.START_PHOTO ? '𝙰𝚍𝚍𝚎𝚍' : '𝙽𝚘𝚝 𝚊𝚍𝚍𝚎𝚍';
  const hasFsub = ctx.settings.messages.FSUB_PHOTO ? '𝙰𝚍𝚍𝚎𝚍' : '𝙽𝚘𝚝 𝚊𝚍𝚍𝚎𝚍';

  const msg = `<blockquote><b>🖼️ ᴍᴇᴅɪᴀ & ᴘʜᴏᴛᴏꜱ</b></blockquote>\n\n<b>›› ꜱᴛᴀʀᴛ ᴘʜᴏᴛᴏ :</b> <code>${hasStart}</code>\n<b>›› ꜰꜱᴜʙ ᴘʜᴏᴛᴏ :</b> <code>${hasFsub}</code>\n\n<i>Use the buttons below to set photos.</i>`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: 'ꜱᴇᴛ ꜱᴛᴀʀᴛ ᴘɪᴄ', callback_data: 'set_photo_start' }, { text: 'ꜱᴇᴛ ꜰꜱᴜʙ ᴘɪᴄ', callback_data: 'set_photo_fsub' }],
    [{ text: 'ʀᴇᴍᴏᴠᴇ ꜱᴛᴀʀᴛ ᴘɪᴄ', callback_data: 'rm_start_photo' }, { text: 'ʀᴇᴍᴏᴠᴇ ꜰꜱᴜʙ ᴘɪᴄ', callback_data: 'rm_fsub_photo' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg2' }],
  ]});
}

export async function handleRmStartPhoto(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.messages.START_PHOTO = '';
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.answerCallbackQuery(query.id, { text: 'Start Photo Removed!', show_alert: true });
  await handlePhotos(ctx);
}

export async function handleRmFsubPhoto(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.messages.FSUB_PHOTO = '';
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.answerCallbackQuery(query.id, { text: 'FSUB Photo Removed!', show_alert: true });
  await handlePhotos(ctx);
}

// ─── Auto Delete Settings ───

export async function handleAutoDelSettings(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const currentDel = ctx.settings.auto_del;
  const statusText = currentDel > 0 ? `${currentDel} seconds` : 'Disabled';

  const msg = `<blockquote><b>🗑️ ᴀᴜᴛᴏ ᴅᴇʟᴇᴛᴇ ꜱᴇᴛᴛɪɴɢꜱ</b></blockquote>\n\n<b>ᴄᴜʀʀᴇɴᴛ ᴛɪᴍᴇʀ:</b> <code>${statusText}</code>\n\n<i>Use the button below to set the timer (0 to disable).</i>`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: 'ꜱᴇᴛ ᴀᴜᴛᴏ ᴅᴇʟᴇᴛᴇ ᴛɪᴍᴇʀ', callback_data: 'set_auto_del' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg1' }]
  ]});
}

// ─── DB Settings Panel ───

export async function handleDbSettings(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const db = ctx.settings.databases;
  const msg = `<blockquote><b>🗄️ ᴅᴀᴛᴀʙᴀꜱᴇ ᴄʜᴀɴɴᴇʟꜱ</b></blockquote>\n\n<b>›› ᴘʀɪᴍᴀʀʏ:</b> <code>${db.primary || 'Not Set'}</code>\n<b>›› ꜱᴇᴄᴏɴᴅᴀʀʏ:</b> ${db.secondary.length > 0 ? db.secondary.map(s => `<code>${s}</code>`).join(', ') : '<i>None</i>'}\n<b>›› ʙᴀᴄᴋᴜᴘ:</b> <code>${db.backup || 'Not Set'}</code>\n\n<i>Use the buttons below to manage your database channels.</i>`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: '››ᴀᴅᴅ ᴅʙ ᴄʜᴀɴɴᴇʟ', callback_data: 'add_db' }, { text: '››ʀᴇᴍᴏᴠᴇ ᴅʙ ᴄʜᴀɴɴᴇʟ', callback_data: 'rm_db' }],
    [{ text: '››ꜱᴇᴛ ᴘʀɪᴍᴀʀʏ', callback_data: 'set_primary_db' }, { text: '››ꜱᴇᴛ ʙᴀᴄᴋᴜᴘ', callback_data: 'set_backup_db' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg1' }]
  ]}, "https://graph.org/file/7d25f187b033c8d31f29b-b2310e1fd72d0aca4c.jpg");
}

// ─── Auto Approval Settings ───

export async function handleAutoApproveSettings(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const enabled = ctx.settings.auto_approval_enabled;
  const delay = ctx.settings.approval_delay;
  const channels = await ctx.db.getAutoApprovalChannels();

  const msg = `<blockquote><b>✅ ᴀᴜᴛᴏ ᴀᴘᴘʀᴏᴠᴀʟ ꜱᴇᴛᴛɪɴɢꜱ</b></blockquote>\n\n<b>›› ꜱᴛᴀᴛᴜꜱ:</b> ${enabled ? '✅ Enabled' : '❌ Disabled'}\n<b>›› ᴅᴇʟᴀʏ:</b> ${delay} seconds\n<b>›› ᴄʜᴀɴɴᴇʟꜱ:</b> ${channels.length}`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: enabled ? '❌ ᴅɪꜱᴀʙʟᴇ' : '✅ ᴇɴᴀʙʟᴇ', callback_data: 'toggle_auto_approve' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg2' }],
  ]});
}

export async function handleToggleAutoApprove(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.auto_approval_enabled = !ctx.settings.auto_approval_enabled;
  await ctx.db.saveBotSetting('auto_approval_enabled', ctx.settings.auto_approval_enabled);
  await ctx.api.answerCallbackQuery(query.id, { text: `Auto Approval ${ctx.settings.auto_approval_enabled ? 'Enabled' : 'Disabled'}` });
  await handleAutoApproveSettings(ctx);
}

// ─── Credit Settings ───

export async function handleCreditSettings(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const chatId = query.message!.chat.id;
  const msgId = query.message!.message_id;

  const s = ctx.settings;
  const msg = `<blockquote><b>💰 ᴄʀᴇᴅɪᴛ ꜱʏꜱᴛᴇᴍ</b></blockquote>\n\n<b>›› ꜱᴛᴀᴛᴜꜱ:</b> ${s.credit_system_enabled ? '✅ Enabled' : '❌ Disabled'}\n<b>›› ᴘᴇʀ ᴠɪꜱɪᴛ:</b> ${s.credits_per_visit}\n<b>›› ᴘᴇʀ ꜰɪʟᴇ:</b> ${s.credits_per_file}\n<b>›› ᴍᴀx ʟɪᴍɪᴛ:</b> ${s.max_credit_limit}`;

  await ctx.api.editMessageText(chatId, msgId, msg, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [
      [{ text: s.credit_system_enabled ? '❌ ᴅɪꜱᴀʙʟᴇ' : '✅ ᴇɴᴀʙʟᴇ', callback_data: 'toggle_credits' }],
      [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg2' }],
    ]},
  });
}

export async function handleToggleCredits(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.credit_system_enabled = !ctx.settings.credit_system_enabled;
  await ctx.db.saveBotSetting('credit_system_enabled', ctx.settings.credit_system_enabled);
  await ctx.api.answerCallbackQuery(query.id, { text: `Credit System ${ctx.settings.credit_system_enabled ? 'Enabled' : 'Disabled'}` });
  await handleCreditSettings(ctx);
}

// ─── Texts Panel ───

export async function handleTexts(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const msg = `<blockquote><b>📝 ᴛᴇxᴛ ꜱᴇᴛᴛɪɴɢꜱ</b></blockquote>\n\n<i>Use the buttons below to update texts.</i>`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [
    [{ text: 'ꜱᴛᴀʀᴛ ᴛᴇxᴛ', callback_data: 'set_text_start' }, { text: 'ꜰꜱᴜʙ ᴛᴇxᴛ', callback_data: 'set_text_fsub' }],
    [{ text: 'ᴀʙᴏᴜᴛ ᴛᴇxᴛ', callback_data: 'set_text_about' }, { text: 'ʜᴇʟᴘ ᴛᴇxᴛ', callback_data: 'set_text_help' }],
    [{ text: 'ʀᴇᴘʟʏ ᴛᴇxᴛ', callback_data: 'set_text_reply' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg2' }]
  ]});
}

// ─── Link Manage / Generate Info (from settings page 3) ───

export async function handleLinkManage(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const linkChannels = await ctx.db.getLinkChannels();
  let text: string;

  if (linkChannels.length === 0) {
    text = `<b>📋 Link Sharing Channels</b>\n\n<i>No channels configured yet.</i>\n\n<b>To add a channel:</b>\n1. Make the bot admin in your channel\n2. Use: <code>/addch channel_id</code>`;
  } else {
    text = '<b><blockquote>✧ ʟɪɴᴋ ꜱʜᴀʀɪɴɢ ᴄʜᴀɴɴᴇʟꜱ</blockquote></b>\n';
    for (let i = 0; i < Math.min(linkChannels.length, 5); i++) {
      try {
        const chat = await ctx.api.getChat(linkChannels[i]);
        text += `<b>${i + 1}. ${chat.title}</b>\n   <code>${linkChannels[i]}</code>\n\n`;
      } catch {
        text += `${i + 1}. <code>${linkChannels[i]}</code> (Error)\n\n`;
      }
    }
    if (linkChannels.length > 5) text += `<i>...and ${linkChannels.length - 5} more</i>\n\n`;
    text += '<b>Commands:</b>\n• <code>/addch id</code> - Add\n• <code>/delch id</code> - Remove\n• <code>/channels</code> - View all';
  }

  await editOrSendSettings(ctx, text, { inline_keyboard: [[{ text: '◀️ Back', callback_data: 'settings_pg3' }]] });
}

export async function handleLinkGenerate(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  const text = `<b>🔗 Link Generation</b>\n\n<b>Available Commands:</b>\n\n• <code>/links</code> — Show all links\n• <code>/reqlink</code> — Request links with buttons\n• <code>/bulklink id1 id2</code> — Generate for multiple channels`;

  await editOrSendSettings(ctx, text, { inline_keyboard: [[{ text: '◀️ Back', callback_data: 'settings_pg3' }]] });
}

// ─── /setphoto command ───

export async function handleSetPhoto(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/);

  if (parts.length < 3) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/setphoto start|fsub URL</code>', { parse_mode: 'HTML' });
    return;
  }

  const type = parts[1].toLowerCase();
  const url = parts.slice(2).join(' ');
  const keyMap: Record<string, string> = { start: 'START_PHOTO', fsub: 'FSUB_PHOTO' };
  const key = keyMap[type];

  if (!key) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid type. Use: start or fsub</b>', { parse_mode: 'HTML' });
    return;
  }

  ctx.settings.messages[key] = url;
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ <b>${key.replace('_', ' ')}</b> updated!`, { parse_mode: 'HTML' });
}

// ─── /settext command ───

export async function handleSetText(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/);

  if (parts.length < 3) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/settext start|fsub|about|help|reply Your text</code>', { parse_mode: 'HTML' });
    return;
  }

  const type = parts[1].toUpperCase();
  const value = (msg.text || '').split(/\s+/).slice(2).join(' ');
  const validKeys = ['START', 'FSUB', 'ABOUT', 'HELP', 'REPLY'];

  if (!validKeys.includes(type)) {
    await ctx.api.sendMessage(msg.chat.id, `<b>Invalid type. Use: ${validKeys.join(', ').toLowerCase()}</b>`, { parse_mode: 'HTML' });
    return;
  }

  ctx.settings.messages[type] = value;
  if (type === 'REPLY') ctx.settings.reply_text = value;

  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ <b>${type}</b> text updated!`, { parse_mode: 'HTML' });
}

// ─── /setautodel command ───

export async function handleSetAutoDelCommand(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/);

  if (parts.length < 2) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/setautodel seconds</code>\nUse 0 to disable.', { parse_mode: 'HTML' });
    return;
  }

  const seconds = parseInt(parts[1], 10);
  if (isNaN(seconds) || seconds < 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid value. Please provide a non-negative number.</b>', { parse_mode: 'HTML' });
    return;
  }

  ctx.settings.auto_del = seconds;
  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ Auto-delete timer set to <b>${seconds === 0 ? 'Disabled' : seconds + ' seconds'}</b>`, { parse_mode: 'HTML' });
}

// ─── /setdb command ───

export async function handleSetDbCommand(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/);

  if (parts.length < 3) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/setdb primary|secondary|backup channel_id</code>', { parse_mode: 'HTML' });
    return;
  }

  const type = parts[1].toLowerCase();
  const channelId = parseInt(parts[2], 10);
  if (isNaN(channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid channel ID.</b>', { parse_mode: 'HTML' });
    return;
  }

  if (type === 'primary') ctx.settings.databases.primary = channelId;
  else if (type === 'secondary') ctx.settings.databases.secondary.push(channelId);
  else if (type === 'backup') ctx.settings.databases.backup = channelId;
  else {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid type. Use: primary, secondary, or backup</b>', { parse_mode: 'HTML' });
    return;
  }

  ctx.settings.all_db_ids = [ctx.settings.databases.primary, ...ctx.settings.databases.secondary].filter(Boolean);

  await ctx.db.saveSettings({ admins: ctx.settings.admins, messages: ctx.settings.messages, auto_del: ctx.settings.auto_del, disable_btn: ctx.settings.disable_btn, reply_text: ctx.settings.reply_text, fsub: ctx.settings.fsubs, databases: ctx.settings.databases });
  await ctx.api.sendMessage(msg.chat.id, `✅ Database <b>${type}</b> set to <code>${channelId}</code>`, { parse_mode: 'HTML' });
}
