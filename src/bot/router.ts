// ─── Update Router — dispatches Telegram updates to handlers ───

import type { BotContext} from '../types';
import { isAdmin, isOwner } from './middleware/auth';
import { logger } from '../utils/logger';

// Command handlers
import { handleStart } from './handlers/start';
import { handleHelp, handleHome, handleAbout, handleClose } from './handlers/about';
import { handleAddFsubCommand, handleRmFsubCommand, handleFsubPanel, handleAddFsubButton, handleRmFsubButton, processAddFsub, processRmFsub } from './handlers/forceSub';
import {
  handleSettingsCommand, handleSettingsCallback, handleSettingsPage1, handleSettingsPage2, handleSettingsPage3,
  handleFileSettings, handleToggleProtect, handleToggleCaption, handleToggleChannelBtn,
  handlePhotos, handleRmStartPhoto, handleRmFsubPhoto, handleAutoDelSettings, handleDbSettings,
  handleAutoApproveSettings, handleToggleAutoApprove, handleCreditSettings, handleToggleCredits,
  handleTexts, handleLinkManage, handleLinkGenerate,
  handleSetPhoto, handleSetText, handleSetAutoDelCommand, handleSetDbCommand,
} from './handlers/settings';
import { handleAdminsPanel, handleAddAdminButton, handleRmAdminButton, handleAddAdminCommand, handleRmAdminCommand, processAddAdmin, processRmAdmin } from './handlers/admin';
import { handleJoinRequest } from './handlers/joinRequest';
import { handleGenlink, handleBatch, handleChannelPost, processBatchFirst, processBatchSecond } from './handlers/linkGen';
import { handleAddChannel, handleDelChannel, handleShowChannels, handleShowLinks, handleBulkLink } from './handlers/linkSharing';
import { handleShortenerPanel, handleToggleShortner, handleTestShortner, handleSetShortenerPrompt, processShortenerAction } from './handlers/shortener';
import { handleDbActionPrompts, processDbAction, handleSetAutoDelPrompt, processSetAutoDel, handleSetTextPrompt, processSetText, handleSetPhotoPrompt, processSetPhoto } from './handlers/settingsActions';
import { handleBroadcast } from './handlers/broadcast';
import { handleBan, handleUnban } from './handlers/ban';
import { handleUsers } from './handlers/users';

// ─── Command Registry (name → handler) ───

const ADMIN_COMMANDS = new Map<string, (ctx: BotContext) => Promise<void>>([
  ['settings', handleSettingsCommand],
  ['users', handleUsers],
  ['ban', handleBan],
  ['unban', handleUnban],
  ['broadcast', handleBroadcast],
  ['batch', handleBatch],
  ['genlink', handleGenlink],
  ['addch', handleAddChannel],
  ['delch', handleDelChannel],
  ['channels', handleShowChannels],
  ['links', handleShowLinks],
  ['bulklink', handleBulkLink],
  ['addadmin', handleAddAdminCommand],
  ['rmadmin', handleRmAdminCommand],
  ['addfsub', handleAddFsubCommand],
  ['rmfsub', handleRmFsubCommand],
  ['setphoto', handleSetPhoto],
  ['settext', handleSetText],
  ['setautodel', handleSetAutoDelCommand],
  ['setdb', handleSetDbCommand],
  ['setshortener', async (ctx) => { await ctx.api.sendMessage(ctx.update.message!.chat.id, 'Use the shortener settings panel.'); }],
  ['settutorial', async (ctx) => { await ctx.api.sendMessage(ctx.update.message!.chat.id, 'Use the shortener settings panel.'); }],
  ['setpremium', async (ctx) => { await ctx.api.sendMessage(ctx.update.message!.chat.id, 'Use the shortener settings panel.'); }],
  ['shortner', async (ctx) => { await ctx.api.sendMessage(ctx.update.message!.chat.id, 'Use the settings panel.'); }],
]);

const PUBLIC_COMMANDS = new Map<string, (ctx: BotContext) => Promise<void>>([
  ['start', handleStart],
  ['help', handleHelp],
]);

// ─── Callback Registry ───

const CALLBACK_MAP = new Map<string, (ctx: BotContext) => Promise<void>>([
  ['home', handleHome],
  ['about', handleAbout],
  ['close', handleClose],
  ['settings', handleSettingsCallback],
  ['settings_pg1', handleSettingsPage1],
  ['settings_pg2', handleSettingsPage2],
  ['settings_pg3', handleSettingsPage3],
  ['fsub', handleFsubPanel],
  ['add_fsub', handleAddFsubButton],
  ['rm_fsub', handleRmFsubButton],
  ['admins', handleAdminsPanel],
  ['add_admin', handleAddAdminButton],
  ['rm_admin', handleRmAdminButton],
  ['file_settings', handleFileSettings],
  ['toggle_protect', handleToggleProtect],
  ['toggle_caption', handleToggleCaption],
  ['toggle_ch_btn', handleToggleChannelBtn],
  ['photos', handlePhotos],
  ['rm_start_photo', handleRmStartPhoto],
  ['rm_fsub_photo', handleRmFsubPhoto],
  ['auto_del', handleAutoDelSettings],
  ['db_settings', handleDbSettings],
  ['auto_approve', handleAutoApproveSettings],
  ['toggle_auto_approve', handleToggleAutoApprove],
  ['credit_settings', handleCreditSettings],
  ['toggle_credits', handleToggleCredits],
  ['texts', handleTexts],
  ['link_manage', handleLinkManage],
  ['link_generate', handleLinkGenerate],
  ['shortner', handleShortenerPanel],
  ['toggle_shortner', handleToggleShortner],
  ['test_shortner', handleTestShortner],
  ['add_db', handleDbActionPrompts],
  ['rm_db', handleDbActionPrompts],
  ['set_primary_db', handleDbActionPrompts],
  ['set_backup_db', handleDbActionPrompts],
  ['set_auto_del', handleSetAutoDelPrompt],
  ['set_text_start', handleSetTextPrompt],
  ['set_text_fsub', handleSetTextPrompt],
  ['set_text_about', handleSetTextPrompt],
  ['set_text_help', handleSetTextPrompt],
  ['set_text_reply', handleSetTextPrompt],
  ['set_photo_start', handleSetPhotoPrompt],
  ['set_photo_fsub', handleSetPhotoPrompt],
  ['set_shortner_api', handleSetShortenerPrompt],
  ['set_shortner_url', handleSetShortenerPrompt],
  ['set_tutorial_url', handleSetShortenerPrompt],
  ['set_premium_url', handleSetShortenerPrompt],
]);

// ─── Pending action processors ───

const PENDING_ACTIONS = new Map<string, (ctx: BotContext, data?: any) => Promise<void>>([
  ['add_fsub', processAddFsub],
  ['rm_fsub', processRmFsub],
  ['add_admin', processAddAdmin],
  ['rm_admin', processRmAdmin],
  ['batch_first', processBatchFirst],
  ['batch_second', processBatchSecond],
  ['db_action', processDbAction],
  ['set_auto_del', processSetAutoDel],
  ['set_text', processSetText],
  ['set_photo', processSetPhoto],
  ['shortener_action', processShortenerAction],
]);

// ─── Main Router ───

export async function routeUpdate(ctx: BotContext): Promise<void> {
  const update = ctx.update;

  try {
    // Chat join request
    if (update.chat_join_request) {
      await handleJoinRequest(ctx);
      return;
    }

    // Callback query
    if (update.callback_query) {
      if (update.callback_query.message?.chat.type !== 'private') {
        return; // Only work in PM
      }
      const data = update.callback_query.data || '';
      const userId = update.callback_query.from.id;

      // Admin-only callbacks (everything except home/about/close)
      if (!['home', 'about', 'close'].includes(data)) {
        if (!isAdmin(ctx, userId)) {
          await ctx.api.answerCallbackQuery(update.callback_query.id, {
            text: '❌ ᴏɴʟʏ ᴀᴅᴍɪɴꜱ ᴄᴀɴ ᴜꜱᴇ ᴛʜɪꜱ!',
            show_alert: true,
          });
          return;
        }
      }

      const handler = CALLBACK_MAP.get(data);
      if (handler) {
        await handler(ctx);
      } else {
        logger.warn('router', `Unknown callback: ${data}`);
        await ctx.api.answerCallbackQuery(update.callback_query.id);
      }
      return;
    }

    // Message
    if (update.message) {
      if (update.message.chat.type !== 'private') {
        return; // Work only in PM
      }
      const msg = update.message;
      const userId = msg.from?.id;
      if (!userId) return;

      // Check pending action FIRST
      const pendingAction = await ctx.db.getPendingAction(userId);
      if (pendingAction) {
        await ctx.db.deletePendingAction(userId);
        const processor = PENDING_ACTIONS.get(pendingAction.action);
        if (processor) {
          await processor(ctx, pendingAction.data);
          return;
        }
      }

      // Check for commands
      const text = msg.text || '';
      if (text.startsWith('/')) {
        const commandRaw = text.split(' ')[0].split('@')[0].substring(1).toLowerCase();

        // Public commands (anyone can use)
        const publicHandler = PUBLIC_COMMANDS.get(commandRaw);
        if (publicHandler) {
          await publicHandler(ctx);
          return;
        }

        // Admin commands
        const adminHandler = ADMIN_COMMANDS.get(commandRaw);
        if (adminHandler) {
          if (!isAdmin(ctx, userId)) {
            await ctx.api.sendMessage(msg.chat.id, ctx.settings.reply_text, { parse_mode: 'HTML' });
            return;
          }
          await adminHandler(ctx);
          return;
        }

        // Unknown command → treat as reply text for non-admins
        if (!isAdmin(ctx, userId)) {
          await ctx.api.sendMessage(msg.chat.id, ctx.settings.reply_text, { parse_mode: 'HTML' });
          return;
        }
      }

      // Non-command messages
      if (isAdmin(ctx, userId)) {
        // Admin sends non-command content → handle as channel post (file upload to DB)
        if (msg.document || msg.video || msg.photo || msg.forward_from_chat || msg.forward_origin) {
          await handleChannelPost(ctx);
          return;
        }
        // Admin text that looks like forwarded link
        if (text && !text.startsWith('/')) {
          await handleChannelPost(ctx);
          return;
        }
      } else {
        // Non-admin non-command → reply text
        await ctx.api.sendMessage(msg.chat.id, ctx.settings.reply_text, { parse_mode: 'HTML' });
      }

      return;
    }

    // Channel post (new post in DB channel)
    if (update.channel_post) {
      const post = update.channel_post;
      if (ctx.settings.all_db_ids.includes(post.chat.id) && !ctx.settings.disable_btn) {
        const { encode } = await import('../utils/base64');
        const MIGRATOR_BOT = 'LelouchAMbot';
        const base64String = encode(`single_${post.chat.id}_${post.message_id}`);
        const migratorLink = `https://t.me/${MIGRATOR_BOT}?start=${base64String}`;

        try {
          await ctx.api.editMessageReplyMarkup(post.chat.id, post.message_id, {
            inline_keyboard: [[{ text: '🚀 Get File', url: migratorLink }]],
          });
        } catch (e: any) {
          logger.warn('router', `Could not add button to channel post: ${e.message}`);
        }
      }
      return;
    }
  } catch (error: any) {
    logger.error('router', `Error routing update ${update.update_id}: ${error.message}`, { stack: error.stack });
  }
}
