// ─── Force Subscription Check + Management ───

import type { BotContext, TelegramUser, TelegramInlineKeyboardButton } from '../../types';
import { editOrSendSettings } from './settings';
import { logger } from '../../utils/logger';

// ─── Check if user is subscribed to all fsub channels ───

export async function checkSubscription(ctx: BotContext, userId: number): Promise<Record<number, string | null>> {
  const statuses: Record<number, string | null> = {};
  for (const [chIdStr, info] of Object.entries(ctx.settings.fsub_dict)) {
    const chId = parseInt(chIdStr, 10);
    // If request-based and user is tracked in channel DB
    if (info.request && await ctx.db.isUserInChannel(chId, userId)) {
      statuses[chId] = 'member';
      continue;
    }
    try {
      const member = await ctx.api.getChatMember(chId, userId);
      statuses[chId] = member.status;
    } catch (e: any) {
      if (e.message?.includes('user not found') || e.code === 400) {
        statuses[chId] = 'left';
      } else {
        logger.warn('forceSub', `Error checking ${chId}: ${e.message}`);
        statuses[chId] = null; // skip on error
      }
    }
  }
  return statuses;
}

export function isUserSubscribed(statuses: Record<number, string | null>): boolean {
  const validStatuses = Object.values(statuses).filter(s => s !== null);
  if (validStatuses.length === 0) return true; // no channels to check
  return validStatuses.every(s => ['member', 'administrator', 'creator'].includes(s!));
}

// ─── Force sub gate — returns true if user can proceed ───

export async function enforceForceSub(ctx: BotContext, userId: number, chatId: number, startParam?: string): Promise<boolean> {
  if (Object.keys(ctx.settings.fsub_dict).length === 0) return true;

  const fsubPhoto = ctx.settings.messages.FSUB_PHOTO || '';
  let waitMsg: any;
  if (fsubPhoto) {
    waitMsg = await ctx.api.sendPhoto(chatId, fsubPhoto, {
      caption: '<b>ᴡᴀɪᴛ ᴀ ꜱᴇᴄᴏɴᴅ....</b>',
      parse_mode: 'HTML',
    });
  } else {
    waitMsg = await ctx.api.sendMessage(chatId, '<b>ᴡᴀɪᴛ ᴀ ꜱᴇᴄᴏɴᴅ....</b>', { parse_mode: 'HTML' });
  }

  const statuses = await checkSubscription(ctx, userId);
  if (isUserSubscribed(statuses)) {
    await ctx.api.deleteMessage(chatId, waitMsg.message_id);
    return true;
  }

  // Build buttons for unjoined channels
  const buttons: TelegramInlineKeyboardButton[] = [];
  const statusLines: string[] = [];

  for (const [chIdStr, info] of Object.entries(ctx.settings.fsub_dict)) {
    const chId = parseInt(chIdStr, 10);
    const status = statuses[chId];
    if (['member', 'administrator', 'creator'].includes(status || '')) {
      statusLines.push(`› ${info.name} - <b>Joined</b> ✅`);
    } else {
      statusLines.push(`› ${info.name} - <i>Required</i> ❗️`);
      let link = info.invite_link;
      if (info.timer > 0) {
        try {
          const expireDate = Math.floor(Date.now() / 1000) + info.timer * 60;
          const invite = await ctx.api.createChatInviteLink(chId, {
            expire_date: expireDate,
            creates_join_request: info.request,
          });
          link = invite.invite_link;
        } catch (e: any) {
          logger.warn('forceSub', `Couldn't create invite for ${chId}: ${e.message}`);
        }
      }
      if (link) {
        buttons.push({ text: `Join ${info.name}`, url: link });
      }
    }
  }

  const fsubText = ctx.settings.messages.FSUB || '<blockquote><b>Join Required</b></blockquote>';
  const channelsMessage = `${fsubText}\n\n${statusLines.join('\n')}`;

  const buttonLayout: TelegramInlineKeyboardButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    buttonLayout.push(buttons.slice(i, i + 2));
  }

  if (startParam) {
    const tryAgainLink = `https://t.me/${ctx.settings.bot_username}/?start=${startParam}`;
    buttonLayout.push([{ text: '🔄 ᴛʀʏ ᴀɢᴀɪɴ', url: tryAgainLink }]);
  }

  if (fsubPhoto) {
    await ctx.api.editMessageCaption(chatId, waitMsg.message_id, channelsMessage, {
      parse_mode: 'HTML',
      reply_markup: buttonLayout.length > 0 ? { inline_keyboard: buttonLayout } : undefined,
    }).catch(async () => {
      await ctx.api.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
      await ctx.api.sendPhoto(chatId, fsubPhoto, {
        caption: channelsMessage,
        parse_mode: 'HTML',
        reply_markup: buttonLayout.length > 0 ? { inline_keyboard: buttonLayout } : undefined,
      });
    });
  } else {
    await ctx.api.editMessageText(chatId, waitMsg.message_id, channelsMessage, {
      parse_mode: 'HTML',
      reply_markup: buttonLayout.length > 0 ? { inline_keyboard: buttonLayout } : undefined,
    }).catch(async () => {
      await ctx.api.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
      await ctx.api.sendMessage(chatId, channelsMessage, {
        parse_mode: 'HTML',
        reply_markup: buttonLayout.length > 0 ? { inline_keyboard: buttonLayout } : undefined,
      });
    });
  }

  return false;
}

// ─── FSub Settings Panel (callback: 'fsub') ───

export async function handleFsubPanel(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const chatId = query.message!.chat.id;
  const msgId = query.message!.message_id;

  let channelListText = '';
  if (Object.keys(ctx.settings.fsub_dict).length > 0) {
    const lines: string[] = [];
    for (const [chIdStr, info] of Object.entries(ctx.settings.fsub_dict)) {
      const requestText = info.request ? '✓ ʀᴇǫᴜᴇꜱᴛ' : '✗ ᴅɪʀᴇᴄᴛ';
      const timerText = info.timer > 0 ? `${info.timer}m` : '☠ ᴘᴇʀᴍᴀɴᴇɴᴛ';
      lines.push(`• <b>${info.name}</b>\n(<code>${chIdStr}</code>) - <b>${requestText}</b> - <b>ᴛɪᴍᴇʀ:</b> ${timerText}`);
    }
    channelListText = lines.join('\n\n');
  } else {
    channelListText = '› <i>None configured.</i>';
  }

  const msg = `<blockquote><b>✧ ꜰᴏʀᴄᴇ ꜱᴜʙꜱᴄʀɪᴘᴛɪᴏɴ ꜱᴇᴛᴛɪɴɢꜱ</b></blockquote>\n<b>›› ᴄᴏɴꜰɪɢᴜʀᴇᴅ ᴄʜᴀɴɴᴇʟꜱ:</b>\n${channelListText}\n\n<i>Use the buttons below or commands:\n/addfsub channel_id yes/no timer_minutes\n/rmfsub channel_id</i>`;
  const reply_markup = { inline_keyboard: [
    [{ text: '›› ᴀᴅᴅ ᴄʜᴀɴɴᴇʟ', callback_data: 'add_fsub' }, { text: '›› ʀᴇᴍᴏᴠᴇ ᴄʜᴀɴɴᴇʟ', callback_data: 'rm_fsub' }],
    [{ text: '‹ ʙᴀᴄᴋ', callback_data: 'settings_pg1' }],
  ]};

  await editOrSendSettings(ctx, msg, reply_markup);
}

// ─── Add FSub (sets pending action) ───

export async function handleAddFsubButton(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  await ctx.db.setPendingAction(query.from.id, 'add_fsub');

  const msg = `<blockquote><b>➕ ᴀᴅᴅ ᴀ ꜰᴏʀᴄᴇ ꜱᴜʙ ᴄʜᴀɴɴᴇʟ</b></blockquote>\nPlease send the channel details in this format:\n<code>Channel_ID Request_Enabled Timer_in_Minutes</code>\n\n<b>Example:</b> <code>-100123456789 yes 5</code>\n› <code>-100...</code> is the Channel ID.\n› <code>yes</code> enables request-to-join links.\n› <code>5</code> means the link will expire after 5 minutes. Use <code>0</code> for non-expiring.`;
  await editOrSendSettings(ctx, msg, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'fsub' }]] });
}

// ─── Remove FSub (sets pending action) ───

export async function handleRmFsubButton(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  await ctx.db.setPendingAction(query.from.id, 'rm_fsub');

  const msg = '<blockquote><b>➖ Remove a Force Sub Channel</b></blockquote>\nPlease send the Channel ID of the channel you want to remove.';
  await editOrSendSettings(ctx, msg, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'fsub' }]] });
}

// ─── Process pending fsub actions ───

export async function processAddFsub(ctx: BotContext) {
  const msg = ctx.update.message!;
  const text = msg.text || '';
  const parts = text.trim().split(/\s+/);

  if (parts.length !== 3) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid format.</b> Please provide all three values as requested.', { parse_mode: 'HTML' });
    return;
  }

  const [chIdStr, requestStr, timerStr] = parts;
  const channelId = parseInt(chIdStr, 10);
  if (isNaN(channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid channel ID.</b>', { parse_mode: 'HTML' });
    return;
  }

  // Check if already exists
  if (ctx.settings.fsubs.some(f => f.channel_id === channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>This channel ID already exists in the force sub list.</b>', { parse_mode: 'HTML' });
    return;
  }

  // Check bot is admin
  try {
    const botMember = await ctx.api.getChatMember(channelId, (await ctx.api.getMe()).id);
    if (!['administrator', 'creator'].includes(botMember.status)) {
      await ctx.api.sendMessage(msg.chat.id, '<b>Bot is not an admin in the channel.</b>', { parse_mode: 'HTML' });
      return;
    }
  } catch (e: any) {
    await ctx.api.sendMessage(msg.chat.id, `<b>Error:</b> <code>${e.message}</code>`, { parse_mode: 'HTML' });
    return;
  }

  const request = ['true', 'on', 'yes'].includes(requestStr.toLowerCase());
  const timer = parseInt(timerStr, 10) || 0;

  ctx.settings.fsubs.push({ channel_id: channelId, request, timer });

  // Get channel info
  const chat = await ctx.api.getChat(channelId);
  let link: string | null = null;
  if (timer <= 0) {
    try {
      const invite = await ctx.api.createChatInviteLink(channelId, { creates_join_request: request });
      link = invite.invite_link;
    } catch (e: any) {
      logger.warn('forceSub', `Couldn't create invite link for ${channelId}: ${e.message}`);
    }
  }

  ctx.settings.fsub_dict[channelId] = { name: chat.title || 'Unknown', invite_link: link, request, timer };

  // Save to DB
  await ctx.db.saveSettings({
    admins: ctx.settings.admins,
    messages: ctx.settings.messages,
    auto_del: ctx.settings.auto_del,
    disable_btn: ctx.settings.disable_btn,
    reply_text: ctx.settings.reply_text,
    fsub: ctx.settings.fsubs,
    databases: ctx.settings.databases,
  });

  await ctx.api.sendMessage(msg.chat.id, `✅ Channel <b>${chat.title}</b> (<code>${channelId}</code>) has been added successfully.`, { parse_mode: 'HTML' });
}

export async function processRmFsub(ctx: BotContext) {
  const msg = ctx.update.message!;
  const channelId = parseInt(msg.text || '', 10);

  if (isNaN(channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Invalid channel ID.</b>', { parse_mode: 'HTML' });
    return;
  }

  if (!ctx.settings.fsubs.some(f => f.channel_id === channelId)) {
    await ctx.api.sendMessage(msg.chat.id, '<b>This channel ID is not in the force sub list!</b>', { parse_mode: 'HTML' });
    return;
  }

  ctx.settings.fsubs = ctx.settings.fsubs.filter(f => f.channel_id !== channelId);
  const removed = ctx.settings.fsub_dict[channelId];
  delete ctx.settings.fsub_dict[channelId];

  await ctx.db.saveSettings({
    admins: ctx.settings.admins,
    messages: ctx.settings.messages,
    auto_del: ctx.settings.auto_del,
    disable_btn: ctx.settings.disable_btn,
    reply_text: ctx.settings.reply_text,
    fsub: ctx.settings.fsubs,
    databases: ctx.settings.databases,
  });

  const channelName = removed ? `<b>${removed.name}</b> ` : '';
  await ctx.api.sendMessage(msg.chat.id, `✅ Channel ${channelName}(<code>${channelId}</code>) has been removed.`, { parse_mode: 'HTML' });
}

// ─── Command-based FSub management ───

export async function handleAddFsubCommand(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/).slice(1); // skip /addfsub

  if (parts.length !== 3) {
    await ctx.api.sendMessage(msg.chat.id,
      '<b>Usage:</b> <code>/addfsub channel_id yes/no timer_minutes</code>\n\n<b>Example:</b> <code>/addfsub -100123456789 yes 5</code>',
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Reuse the same processing logic
  ctx.update.message!.text = parts.join(' ');
  await processAddFsub(ctx);
}

export async function handleRmFsubCommand(ctx: BotContext) {
  const msg = ctx.update.message!;
  const parts = (msg.text || '').split(/\s+/).slice(1);

  if (parts.length !== 1) {
    await ctx.api.sendMessage(msg.chat.id,
      '<b>Usage:</b> <code>/rmfsub channel_id</code>',
      { parse_mode: 'HTML' }
    );
    return;
  }

  ctx.update.message!.text = parts[0];
  await processRmFsub(ctx);
}
