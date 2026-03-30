// ─── Shortener Settings Panel ───

import type { BotContext } from '../../types';
import { testShortener } from '../../utils/shortener';
import { editOrSendSettings } from './settings';

export async function handleShortenerPanel(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  await showShortenerPanel(ctx);
}

async function showShortenerPanel(ctx: BotContext) {
  const s = ctx.settings;
  const enabledText = s.shortner_enabled ? '✓ ᴇɴᴀʙʟᴇᴅ' : '✗ ᴅɪsᴀʙʟᴇᴅ';
  const toggleText = s.shortner_enabled ? '✗ ᴏғғ' : '✓ ᴏɴ';
  const apiDisplay = s.short_api
    ? (s.short_api.length > 20 ? `<code>${s.short_api.slice(0, 20)}...</code>` : `<code>${s.short_api}</code>`)
    : '<code>Not Set</code>';

  const msg = `<blockquote>✦ 𝗦𝗛𝗢𝗥𝗧𝗡𝗘𝗥 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦</blockquote>\n<b><u>ᴄᴜʀʀᴇɴᴛ ꜱᴇᴛᴛɪɴɢꜱ:</u></b>\n<blockquote>›› <b>ꜱʜᴏʀᴛɴᴇʀ ꜱᴛᴀᴛᴜꜱ:</b> ${enabledText}\n›› <b>ꜱʜᴏʀᴛɴᴇʀ ᴜʀʟ:</b> <code>${s.short_url}</code>\n›› <b>ꜱʜᴏʀᴛɴᴇʀ ᴀᴘɪ:</b> ${apiDisplay}\n›› <b>ᴘʀᴇᴍɪᴜᴍ ᴄᴏɴᴛᴀᴄᴛ:</b> <code>${s.messages.PREMIUM_CONTACT || 'Not Set'}</code></blockquote>\n<blockquote>›› <b>ᴛᴜᴛᴏʀɪᴀʟ ʟɪɴᴋ:</b> <code>${s.tutorial_link}</code></blockquote>\n<blockquote><b>≡ ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ᴄᴏɴꜰɪɢᴜʀᴇ.</b></blockquote>`;

  const reply_markup = { inline_keyboard: [
    [{ text: `• ${toggleText} ꜱʜᴏʀᴛɴᴇʀ •`, callback_data: 'toggle_shortner' }, { text: '• ᴛᴇꜱᴛ ꜱʜᴏʀᴛɴᴇʀ •', callback_data: 'test_shortner' }],
    [{ text: 'ꜱᴇᴛ ᴀᴘɪ', callback_data: 'set_shortner_api' }, { text: 'ꜱᴇᴛ ᴜʀʟ', callback_data: 'set_shortner_url' }],
    [{ text: 'ꜱᴇᴛ ᴛᴜᴛᴏʀɪᴀʟ', callback_data: 'set_tutorial_url' }, { text: 'ꜱᴇᴛ ᴘʀᴇᴍɪᴜᴍ', callback_data: 'set_premium_url' }],
    [{ text: '◂ ʙᴀᴄᴋ ᴛᴏ ꜱᴇᴛᴛɪɴɢꜱ', callback_data: 'settings_pg2' }],
  ]};

  await editOrSendSettings(ctx, msg, reply_markup);
}

export async function handleToggleShortner(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  ctx.settings.shortner_enabled = !ctx.settings.shortner_enabled;
  await ctx.db.saveBotSetting('shortner_enabled', ctx.settings.shortner_enabled);
  await ctx.api.answerCallbackQuery(query.id, { text: `✓ ꜱʜᴏʀᴛɴᴇʀ ${ctx.settings.shortner_enabled ? 'ᴇɴᴀʙʟᴇᴅ' : 'ᴅɪsᴀʙʟᴇᴅ'}!` });
  await showShortenerPanel(ctx);
}

export async function handleTestShortner(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);

  if (!ctx.settings.short_api) {
    await ctx.api.editMessageText(query.message!.chat.id, query.message!.message_id,
      '<b>❌ ɴᴏ ᴀᴘɪ ᴋᴇʏ ꜱᴇᴛ!</b>',
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '◂ ʙᴀᴄᴋ', callback_data: 'shortner' }]] } }
    );
    return;
  }

  await editOrSendSettings(ctx, '<b>🔄 ᴛᴇꜱᴛɪɴɢ ꜱʜᴏʀᴛɴᴇʀ...</b>', {});

  const result = await testShortener(ctx.settings.short_url, ctx.settings.short_api);
  const msg = result.success
    ? `<b>✅ ꜱʜᴏʀᴛɴᴇʀ ᴛᴇꜱᴛ ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟ!</b>\n\n<b>ꜱʜᴏʀᴛ ᴜʀʟ:</b> <code>${result.result}</code>`
    : `<b>❌ ꜱʜᴏʀᴛɴᴇʀ ᴛᴇꜱᴛ ꜰᴀɪʟᴇᴅ!</b>\n\n<b>ᴇʀʀᴏʀ:</b> <code>${result.result}</code>`;

  await editOrSendSettings(ctx, msg, { inline_keyboard: [[{ text: '◂ ʙᴀᴄᴋ', callback_data: 'shortner' }]] });
}

export async function handleSetShortenerPrompt(ctx: BotContext) {
  const query = ctx.update.callback_query!;
  await ctx.api.answerCallbackQuery(query.id);
  const type = query.data; // set_shortner_api, set_shortner_url, set_tutorial_url, set_premium_url
  await ctx.db.setPendingAction(query.from.id, 'shortener_action', { type });

  let text = '';
  if (type === 'set_shortner_api') text = 'Send your new Shortener API Key.';
  else if (type === 'set_shortner_url') text = 'Send your new Shortener Domain.\nExample: <code>arolinks.com</code>';
  else if (type === 'set_tutorial_url') text = 'Send your new How-To-Download Tutorial Link.';
  else if (type === 'set_premium_url') text = 'Send your Premium Contact Telegram Link.';

  await editOrSendSettings(ctx, `<blockquote>${text}</blockquote>`, { inline_keyboard: [[{ text: '‹ ᴄᴀɴᴄᴇʟ', callback_data: 'shortner' }]] });
}

export async function processShortenerAction(ctx: BotContext, data: any) {
  const msg = ctx.update.message!;
  const type = data.type;
  const val = (msg.text || '').trim();

  if (!val) {
    await ctx.api.sendMessage(msg.chat.id, '<b>Please send valid text.</b>', { parse_mode: 'HTML' });
    return;
  }

  if (type === 'set_shortner_api') { ctx.settings.short_api = val; await ctx.db.saveBotSetting('short_api', val); }
  else if (type === 'set_shortner_url') { ctx.settings.short_url = val.replace(/^https?:\/\//, '').replace(/\/$/, ''); await ctx.db.saveBotSetting('short_url', ctx.settings.short_url); }
  else if (type === 'set_tutorial_url') { ctx.settings.tutorial_link = val; await ctx.db.saveBotSetting('tutorial_link', val); }
  else if (type === 'set_premium_url') { ctx.settings.messages.PREMIUM_CONTACT = val; await ctx.db.saveSettings(ctx.settings); }

  await ctx.api.sendMessage(msg.chat.id, `✅ <b>Settings Updated!</b>`, { parse_mode: 'HTML' });
}
