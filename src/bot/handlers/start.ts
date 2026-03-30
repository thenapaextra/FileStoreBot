// ─── /start Command Handler (file delivery core) ───

import type { BotContext, TelegramInlineKeyboardButton } from '../../types';
import { isAdmin } from '../middleware/auth';
import { enforceForceSub } from './forceSub';
import { sendStartMenu } from './about';
import { handleLinkSharing } from './linkSharing';
import { getShortUrl } from '../../utils/shortener';
import { decode } from '../../utils/base64';
import { logger } from '../../utils/logger';

export async function handleStart(ctx: BotContext) {
  const msg = ctx.update.message!;
  const userId = msg.from!.id;
  const chatId = msg.chat.id;

  // Register user
  if (!(await ctx.db.presentUser(userId))) {
    await ctx.db.addUser(userId);
  }
  if (await ctx.db.isBanned(userId)) {
    await ctx.api.sendMessage(chatId, '<b>You have been banned!</b>', { parse_mode: 'HTML' });
    return;
  }

  const text = msg.text || '';
  const parts = text.split(' ');
  if (parts.length <= 1) {
    // Force sub check before showing start menu
    const param = parts[1];
    const canProceed = await enforceForceSub(ctx, userId, chatId, param);
    if (!canProceed) return;
    return await sendStartMenu(ctx, msg.from!, chatId);
  }

  const param = parts[1];

  // Force sub check
  const canProceed = await enforceForceSub(ctx, userId, chatId, param);
  if (!canProceed) return;

  // Decode parameter
  const isFromShortener = param.startsWith('dl_');
  const isCreditGet = param.startsWith('creditget_');
  const isEarnCredit = param.startsWith('earn_credit_');

  let base64String = param;
  if (isFromShortener) base64String = param.slice(3);
  else if (isCreditGet) base64String = param.split('_').slice(1).join('_');
  else if (isEarnCredit) base64String = param.split('_').slice(2).join('_');

  let decodedString: string;
  try {
    decodedString = decode(base64String);
  } catch {
    await ctx.api.sendMessage(chatId, '❌ Invalid or expired link.', { parse_mode: 'HTML' });
    return;
  }

  // Link sharing handling
  if (decodedString.startsWith('lnk_') || decodedString.startsWith('req_')) {
    return await handleLinkSharing(ctx, decodedString);
  }

  // Credit earn link
  if (decodedString.startsWith('earn_credit_')) {
    await ctx.db.updateCredits(userId, ctx.settings.credits_per_visit);
    await ctx.api.sendMessage(chatId, `<b>✅ You earned ${ctx.settings.credits_per_visit} credit(s)!</b>`, { parse_mode: 'HTML' });
    return;
  }

  // Credit get
  if (isCreditGet) {
    await ctx.db.updateCredits(userId, ctx.settings.credits_per_visit);
    await ctx.api.sendMessage(chatId, `<b>✅ You earned ${ctx.settings.credits_per_visit} credit(s) for visiting the link!</b>`, { parse_mode: 'HTML' });
  }

  // Credit system check
  if (ctx.settings.credit_system_enabled && !isAdmin(ctx, userId) && !(await ctx.db.isPro(userId))) {
    const credits = await ctx.db.getCredits(userId);
    if (credits < ctx.settings.credits_per_file) {
      await ctx.api.sendMessage(chatId,
        `<b>❌ Insufficient Credits!</b>\n\nYou need <b>${ctx.settings.credits_per_file}</b> credit(s) to access this file.\nYour balance: <b>${credits}</b> credits.`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    await ctx.db.updateCredits(userId, -ctx.settings.credits_per_file);
  }

  // Shortener redirect
  const isAdminUser = isAdmin(ctx, userId);
  const isPremium = await ctx.db.isPro(userId);

  if (ctx.settings.shortner_enabled && !ctx.settings.credit_system_enabled && !isAdminUser && !isPremium && !isFromShortener) {
    const redirectParam = `dl_${base64String}`;
    const directLink = `https://t.me/${ctx.settings.bot_username}?start=${redirectParam}`;
    const shortenedUrl = await getShortUrl(directLink, ctx.settings.short_url, ctx.settings.short_api, true);

    const photo = ctx.settings.messages.SHORTNER_PHOTO || '';
    const captionText = ctx.settings.messages.SHORTNER_MSG || '<b>YOUR LINK IS READY!</b>';
    const premiumContact = ctx.settings.messages.PREMIUM_CONTACT || 'https://t.me/username';

    const buttons = { inline_keyboard: [
      [{ text: '• ᴄʟɪᴄᴋ ʜᴇʀᴇ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ •', url: shortenedUrl }],
      [{ text: 'ᴘʀᴇᴍɪᴜᴍ', url: premiumContact }, { text: 'ᴛᴜᴛᴏʀɪᴀʟ', url: ctx.settings.tutorial_link }],
    ]};

    if (photo) {
      await ctx.api.sendPhoto(chatId, photo, { caption: captionText, parse_mode: 'HTML', reply_markup: buttons });
    } else {
      await ctx.api.sendMessage(chatId, captionText, { parse_mode: 'HTML', reply_markup: buttons, disable_web_page_preview: true });
    }
    return;
  }

  // ─── FILE SENDING LOGIC ───
  let channelId: number;
  let msgIds: number[];

  try {
    const decodedParts = decodedString.split('_');
    const command = decodedParts[0];

    if (command === 'single') {
      channelId = parseInt(decodedParts[1], 10);
      msgIds = [parseInt(decodedParts[2], 10)];
    } else if (command === 'batch') {
      if (decodedParts.length === 4) {
        channelId = parseInt(decodedParts[1], 10);
        const startId = parseInt(decodedParts[2], 10);
        const endId = parseInt(decodedParts[3], 10);
        msgIds = [];
        for (let i = startId; i <= endId; i++) msgIds.push(i);
      } else {
        const batchData = await ctx.db.getBatch(decodedParts[1]);
        if (!batchData) {
          await ctx.api.sendMessage(chatId, '❌ This link has expired.', { parse_mode: 'HTML' });
          return;
        }
        channelId = batchData.channelId;
        msgIds = batchData.ids;
      }
    } else {
      throw new Error('Unsupported link format');
    }
  } catch {
    await ctx.api.sendMessage(chatId, '❌ Invalid or malformed file link.', { parse_mode: 'HTML' });
    return;
  }

  const tempMsg = await ctx.api.sendMessage(chatId, '<b>ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...</b>', { parse_mode: 'HTML' });

  // Send files via copyMessage
  const sentMessageIds: number[] = [];
  let failedCount = 0;

  for (const msgId of msgIds) {
    try {
      const copyOpts: any = { protect_content: ctx.settings.protect };

      // Build buttons
      const buttons: TelegramInlineKeyboardButton[][] = [];
      if (ctx.settings.channel_button_enabled && ctx.settings.button_name && ctx.settings.button_url) {
        buttons.push([{ text: ctx.settings.button_name, url: ctx.settings.button_url }]);
      }

      if (buttons.length > 0) copyOpts.reply_markup = { inline_keyboard: buttons };
      if (ctx.settings.hide_caption) copyOpts.caption = '';

      const result = await ctx.api.copyMessage(chatId, channelId, msgId, copyOpts);
      sentMessageIds.push(result.message_id);
    } catch (e: any) {
      logger.warn('start', `Failed to copy message ${msgId}: ${e.message}`);
      failedCount++;
    }
  }

  await ctx.api.deleteMessage(chatId, tempMsg.message_id);

  if (sentMessageIds.length === 0 && failedCount === 0) {
    await ctx.api.sendMessage(chatId, 'No valid content found in the requested link(s).');
    return;
  }

  if (failedCount > 0) {
    await ctx.api.sendMessage(chatId, `⚠️ <b>Note:</b> ${failedCount} item(s) could not be sent.`, { parse_mode: 'HTML' });
  }

  // Schedule auto-deletion
  if (sentMessageIds.length > 0 && ctx.settings.auto_del > 0) {
    const deleteAt = new Date(Date.now() + ctx.settings.auto_del * 1000);
    const humanTime = formatDuration(ctx.settings.auto_del);

    const warningMsg = await ctx.api.sendMessage(chatId,
      `<b>⚠️ Dᴜᴇ ᴛᴏ Cᴏᴘʏʀɪɢʜᴛ ɪssᴜᴇs....\n<blockquote>Yᴏᴜʀ ғɪʟᴇs ᴡɪʟʟ ʙᴇ ᴅᴇʟᴇᴛᴇᴅ ᴡɪᴛʜɪɴ ${humanTime}. Sᴏ ᴘʟᴇᴀsᴇ ғᴏʀᴡᴀʀᴅ ᴛʜᴇᴍ ᴛᴏ ᴀɴʏ ᴏᴛʜᴇʀ ᴘʟᴀᴄᴇ ғᴏʀ ғᴜᴛᴜʀᴇ ᴀᴠᴀɪʟᴀʙɪʟɪᴛʏ.</blockquote>\n<blockquote>ɴᴏᴛᴇ : ᴜsᴇ ᴠʟᴄ ᴏʀ ᴀɴʏ ᴏᴛʜᴇʀ ɢᴏᴏᴅ ᴠɪᴅᴇᴏ ᴘʟᴀʏᴇʀ ᴀᴘᴘ ᴛᴏ ᴡᴀᴛᴄʜ ᴛʜᴇ ᴇᴘɪsᴏᴅᴇs ᴡɪᴛʜ ɢᴏᴏᴅ ᴇxᴘᴇʀɪᴇɴᴄᴇ!</blockquote></b>`,
      { parse_mode: 'HTML' }
    );

    // Store all message IDs for deletion (files + warning)
    await ctx.db.scheduleDeletion(
      chatId,
      [...sentMessageIds, warningMsg.message_id],
      deleteAt,
      param
    );
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}
