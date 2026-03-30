// ─── Join Request Auto-Approval Handler ───

import type { BotContext } from '../../types';
import { logger } from '../../utils/logger';

export async function handleJoinRequest(ctx: BotContext) {
  const joinRequest = ctx.update.chat_join_request!;
  const userId = joinRequest.from.id;
  const chatId = joinRequest.chat.id;

  // Track the user in channel DB
  await ctx.db.addChannelUser(chatId, userId);

  const isGlobalEnabled = ctx.settings.auto_approval_enabled;
  const isChannelEnabled = await ctx.db.isAutoApprovalEnabled(chatId);

  if (!(isGlobalEnabled && isChannelEnabled)) return;

  logger.info('joinRequest', `Auto-approving ${userId} for ${chatId}`);

  try {
    await ctx.api.approveChatJoinRequest(chatId, userId);

    // Send welcome message
    const photo = ctx.settings.messages.APPROVAL_PHOTO || '';
    const textTemplate = ctx.settings.messages.APPROVAL_WELCOME_TEXT || '';
    const buttonsConfig = ctx.settings.messages.APPROVAL_BUTTONS || [];

    if (textTemplate) {
      try {
        const mention = `<a href="tg://user?id=${userId}">${joinRequest.from.first_name}</a>`;
        const text = textTemplate
          .replace(/{mention}/g, mention)
          .replace(/{chat_title}/g, joinRequest.chat.title || 'Channel');

        // Build buttons
        const buttons: any[][] = [];
        for (const rowConfig of buttonsConfig) {
          const row: any[] = [];
          for (const btnConfig of rowConfig) {
            row.push({
              text: btnConfig.text.replace(/{chat_title}/g, joinRequest.chat.title || 'Channel'),
              url: btnConfig.url,
            });
          }
          buttons.push(row);
        }

        const reply_markup = buttons.length > 0 ? { inline_keyboard: buttons } : undefined;

        if (photo) {
          await ctx.api.sendPhoto(userId, photo, { caption: text, reply_markup, parse_mode: 'HTML' });
        } else {
          await ctx.api.sendMessage(userId, text, { reply_markup, parse_mode: 'HTML', disable_web_page_preview: true });
        }
      } catch (e: any) {
        logger.warn('joinRequest', `Failed to send welcome to ${userId}: ${e.message}`);
      }
    }
  } catch (e: any) {
    logger.error('joinRequest', `Could not approve ${userId} in ${chatId}: ${e.message}`);
  }
}
