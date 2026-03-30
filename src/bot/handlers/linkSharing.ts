// ─── Link Sharing System ───

import type { BotContext } from '../../types';
import { encode } from '../../utils/base64';
import { logger } from '../../utils/logger';

// ─── Handle link sharing when user clicks generated links ───

export async function handleLinkSharing(ctx: BotContext, decodedParam: string) {
  const msg = ctx.update.message!;
  const chatId = msg.chat.id;

  try {
    const isRequest = decodedParam.startsWith('req_');
    const channelIdStr = decodedParam.replace('lnk_', '').replace('req_', '');
    const channelId = parseInt(channelIdStr, 10);

    if (isNaN(channelId)) {
      await ctx.api.sendMessage(chatId, '<b>❌ Invalid channel link format.</b>', { parse_mode: 'HTML' });
      return;
    }

    if (!(await ctx.db.isLinkChannel(channelId))) {
      await ctx.api.sendMessage(chatId, '<b>❌ This channel link is invalid or has been disabled.</b>', { parse_mode: 'HTML' });
      return;
    }

    // Revoke old link if exists
    const oldLinkInfo = await ctx.db.getCurrentInviteLink(channelId);
    if (oldLinkInfo) {
      await ctx.api.revokeChatInviteLink(channelId, oldLinkInfo.invite_link);
    }

    // Create new invite link (5 minute expiry)
    const expireDate = Math.floor(Date.now() / 1000) + 300;
    const invite = await ctx.api.createChatInviteLink(channelId, {
      expire_date: expireDate,
      creates_join_request: isRequest,
    });

    // Save to database
    await ctx.db.saveInviteLink(channelId, invite.invite_link, isRequest);

    // Send to user
    const buttonText = isRequest ? '• ʀᴇǫᴜᴇsᴛ ᴛᴏ ᴊᴏɪɴ •' : '• ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ •';
    await ctx.api.sendMessage(chatId, '<b>ʜᴇʀᴇ ɪs ʏᴏᴜʀ ʟɪɴᴋ! ᴄʟɪᴄᴋ ʙᴇʟᴏᴡ ᴛᴏ ᴘʀᴏᴄᴇᴇᴅ</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: buttonText, url: invite.invite_link }]] },
    });

    await ctx.api.sendMessage(chatId, '<u><b>Note: If the link expires, click the post link again to get a new one.</b></u>', { parse_mode: 'HTML' });
  } catch (e: any) {
    logger.error('linkSharing', `Link sharing error: ${e.message}`);
    await ctx.api.sendMessage(chatId, '<b>❌ An unexpected error occurred while generating your link.</b>', { parse_mode: 'HTML' });
  }
}

// ─── /addch command ───

export async function handleAddChannel(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/);
  if (parts.length < 2) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/addch channel_id</code>\n\n<b>Example:</b> <code>/addch -1001234567890</code>', { parse_mode: 'HTML' });
    return;
  }

  const channelId = parseInt(parts[1], 10);
  if (isNaN(channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>❌ Invalid channel ID.</b>', { parse_mode: 'HTML' });
    return;
  }

  try {
    const chat = await ctx.api.getChat(channelId);
    const botMember = await ctx.api.getChatMember(channelId, (await ctx.api.getMe()).id);
    if (!['administrator', 'creator'].includes(botMember.status)) {
      await ctx.api.sendMessage(msg.chat.id, `<b>❌ I am not an admin in ${chat.title}.</b>`, { parse_mode: 'HTML' });
      return;
    }

    await ctx.db.saveLinkChannel(channelId);

    const base64Invite = encode(`lnk_${channelId}`);
    const base64Request = encode(`req_${channelId}`);
    const normalLink = `https://t.me/${ctx.settings.bot_username}?start=${base64Invite}`;
    const requestLink = `https://t.me/${ctx.settings.bot_username}?start=${base64Request}`;

    await ctx.api.sendMessage(msg.chat.id,
      `<b>✅ Channel Added!</b>\n\n<b>Channel:</b> ${chat.title}\n<b>ID:</b> <code>${channelId}</code>\n\n<b>🔗 Normal Link:</b>\n<code>${normalLink}</code>\n\n<b>🔗 Request Link:</b>\n<code>${requestLink}</code>`,
      { parse_mode: 'HTML' }
    );
  } catch (e: any) {
    await ctx.api.sendMessage(msg.chat.id, `<b>❌ Error:</b> <code>${e.message}</code>`, { parse_mode: 'HTML' });
  }
}

// ─── /delch command ───

export async function handleDelChannel(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/);
  if (parts.length < 2) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/delch channel_id</code>', { parse_mode: 'HTML' });
    return;
  }

  const channelId = parseInt(parts[1], 10);
  const success = await ctx.db.removeLinkChannel(channelId);

  if (success) {
    let title = String(channelId);
    try { title = (await ctx.api.getChat(channelId)).title || title; } catch {}
    await ctx.api.sendMessage(msg.chat.id, `<b>✅ Channel Removed!</b>\n\n<b>Channel:</b> ${title}`, { parse_mode: 'HTML' });
  } else {
    await ctx.api.sendMessage(msg.chat.id, '<b>❌ Channel not found in link sharing system!</b>', { parse_mode: 'HTML' });
  }
}

// ─── /channels command ───

export async function handleShowChannels(ctx: BotContext) {
  const msg = ctx.update.message!;
  const channels = await ctx.db.getLinkChannels();

  if (channels.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>📋 No link sharing channels configured.</b>\n\nUse <code>/addch channel_id</code> to add one.', { parse_mode: 'HTML' });
    return;
  }

  let text = '<b>📋 Link Sharing Channels:</b>\n\n';
  for (let i = 0; i < channels.length; i++) {
    try {
      const chat = await ctx.api.getChat(channels[i]);
      const base64Invite = encode(`lnk_${channels[i]}`);
      const link = `https://t.me/${ctx.settings.bot_username}?start=${base64Invite}`;
      text += `<b>${i + 1}. ${chat.title}</b>\n   <b>ID:</b> <code>${channels[i]}</code>\n   <b>Link:</b> <code>${link}</code>\n\n`;
    } catch {
      text += `<b>${i + 1}. Channel ${channels[i]}</b> (Error)\n\n`;
    }
  }
  text += `<b>Total:</b> ${channels.length}`;

  await ctx.api.sendMessage(msg.chat.id, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '❌ Close', callback_data: 'close' }]] },
  });
}

// ─── /links command ───

export async function handleShowLinks(ctx: BotContext) {
  const msg = ctx.update.message!;
  const channels = await ctx.db.getLinkChannels();

  if (channels.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>📋 No link sharing channels configured.</b>', { parse_mode: 'HTML' });
    return;
  }

  let text = '<b>➤ All Channel Links:</b>\n\n';
  for (let i = 0; i < channels.length; i++) {
    try {
      const chat = await ctx.api.getChat(channels[i]);
      const normalLink = `https://t.me/${ctx.settings.bot_username}?start=${encode(`lnk_${channels[i]}`)}`;
      const requestLink = `https://t.me/${ctx.settings.bot_username}?start=${encode(`req_${channels[i]}`)}`;
      text += `<b>${i + 1}. ${chat.title}</b>\n<b>➥ Normal:</b> <code>${normalLink}</code>\n<b>➤ Request:</b> <code>${requestLink}</code>\n\n`;
    } catch {
      text += `<b>${i + 1}. Channel ${channels[i]}</b> (Error)\n\n`;
    }
  }

  await ctx.api.sendMessage(msg.chat.id, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '❌ Close', callback_data: 'close' }]] },
  });
}

// ─── /bulklink command ───

export async function handleBulkLink(ctx: BotContext) {
  const msg = ctx.update.message!;
  const ids = (msg.text || '').split(/\s+/).slice(1);

  if (ids.length === 0) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Usage:</b> <code>/bulklink id1 id2 ...</code>', { parse_mode: 'HTML' });
    return;
  }

  let text = '<b>➤ Bulk Link Generation:</b>\n\n';
  for (let i = 0; i < ids.length; i++) {
    try {
      const channelId = parseInt(ids[i], 10);
      const chat = await ctx.api.getChat(channelId);
      const normalLink = `https://t.me/${ctx.settings.bot_username}?start=${encode(`lnk_${channelId}`)}`;
      const requestLink = `https://t.me/${ctx.settings.bot_username}?start=${encode(`req_${channelId}`)}`;
      text += `<b>${i + 1}. ${chat.title}</b>\n<b>ID:</b> <code>${channelId}</code>\n<b>➥ Normal:</b> <code>${normalLink}</code>\n<b>➤ Request:</b> <code>${requestLink}</code>\n\n`;
    } catch (e: any) {
      text += `<b>${i + 1}. Channel ${ids[i]}</b> (Error: ${e.message})\n\n`;
    }
  }

  await ctx.api.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
}
