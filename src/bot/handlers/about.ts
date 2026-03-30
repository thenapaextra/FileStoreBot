// ─── About / Home / Close / Help callbacks ───

import type { BotContext, TelegramUser } from '../../types';
import { formatMessage } from '../../config';

export async function handleHome(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  const user = query.from;
  await ctx.api.answerCallbackQuery(query.id);
  await sendStartMenu(ctx, user, query.message!.chat.id, query.message!.message_id);
}

export async function sendStartMenu(ctx: BotContext, user: TelegramUser, chatId: number, editMessageId?: number) {
  const { settings } = ctx;
  const startPhoto = settings.messages.START_PHOTO || '';
  const startText = formatMessage(settings.messages.START || 'Welcome!', user);

  const buttons: any[][] = [];
  if (settings.admins.includes(user.id)) {
    buttons.push([{ text: '⛩️ ꜱᴇᴛᴛɪɴɢꜱ ⛩️', callback_data: 'settings' }]);
  }
  buttons.push([
    { text: 'ᴀʙᴏᴜᴛ', callback_data: 'about' },
    { text: 'ᴄʟᴏꜱᴇ', callback_data: 'close' },
  ]);

  const reply_markup = { inline_keyboard: buttons };

  if (editMessageId && !startPhoto) {
    await ctx.api.editMessageText(chatId, editMessageId, startText, {
      parse_mode: 'HTML',
      reply_markup,
    }).catch(async () => {
      if (editMessageId) await ctx.api.deleteMessage(chatId, editMessageId);
      await ctx.api.sendMessage(chatId, startText, { parse_mode: 'HTML', reply_markup });
    });
  } else if (startPhoto) {
    if (editMessageId) await ctx.api.deleteMessage(chatId, editMessageId);
    await ctx.api.sendPhoto(chatId, startPhoto, {
      caption: startText,
      parse_mode: 'HTML',
      reply_markup,
    });
  } else {
    await ctx.api.sendMessage(chatId, startText, { parse_mode: 'HTML', reply_markup });
  }
}

export async function handleAbout(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const user = query.from;
  const chatId = query.message!.chat.id;
  const msgId = query.message!.message_id;

  const aboutText = formatMessage(ctx.settings.messages.ABOUT || 'About this bot', user, {
    owner_id: String(ctx.settings.owner_id),
    bot_username: ctx.settings.bot_username,
  });

  const buttons = { inline_keyboard: [[
    { text: 'ʜᴏᴍᴇ', callback_data: 'home' },
    { text: 'ᴄʟᴏꜱᴇ', callback_data: 'close' },
  ]] };

  const aboutPhoto = ctx.settings.messages.ABOUT_PHOTO || '';
  if (aboutPhoto) {
    await ctx.api.deleteMessage(chatId, msgId);
    await ctx.api.sendPhoto(chatId, aboutPhoto, {
      caption: aboutText,
      parse_mode: 'HTML',
      reply_markup: buttons,
    });
  } else {
    await ctx.api.editMessageText(chatId, msgId, aboutText, {
      parse_mode: 'HTML',
      reply_markup: buttons,
    }).catch(async () => {
      await ctx.api.deleteMessage(chatId, msgId);
      await ctx.api.sendMessage(chatId, aboutText, { parse_mode: 'HTML', reply_markup: buttons });
    });
  }
}

export async function handleHelp(ctx: BotContext) {
  const msg = ctx.update.message!;
  const helpText = formatMessage(ctx.settings.messages.HELP || 'Help info', msg.from!);
  await ctx.api.sendMessage(msg.chat.id, helpText, { parse_mode: 'HTML' });
}

export async function handleClose(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await ctx.api.deleteMessage(query.message!.chat.id, query.message!.message_id);
}
