import type { Env, BotSettings, FSubEntry } from './types';

// ─── Default Messages (mirrors setup.json) ───

const DEFAULT_MESSAGES: Record<string, any> = {
  START: '<b><blockquote>›› ʜɪ ᴛʜᴇʀᴇ... {mention} ››</blockquote>\n\nɪ ᴀᴍ ᴀ ꜰɪʟᴇ ꜱᴛᴏʀᴇ ʙᴏᴛ...!\nɪ ᴄᴀɴ ᴘʀᴏᴠɪᴅᴇ ᴘʀɪᴠᴀᴛᴇ ꜰɪʟᴇꜱ ᴛʜʀᴏᴜɢʜ ᴀ ꜱᴘᴇᴄɪꜰɪᴄ ʟɪɴᴋ....!\n<blockquote>ᴘᴏᴡᴇʀᴇᴅ ʙʏ @Animes_Mayhem</blockquote></b>',
  FSUB: '<b>ʏᴏᴜʀ ғɪʟᴇ ɪs ʀᴇᴀᴅʏ ‼️ ʟᴏᴏᴋs ʟɪᴋᴇ ʏᴏᴜ ʜᴀᴠᴇɴ\'ᴛ sᴜʙsᴄʀɪʙᴇᴅ ᴛᴏ ᴏᴜʀ ᴄʜᴀɴɴᴇʟs ʏᴇᴛ, sᴜʙsᴄʀɪʙᴇ ɴᴏᴡ ᴛᴏ ɢᴇᴛ ʏᴏᴜʀ ғɪʟᴇs</b>',
  ABOUT: '<b>›› ᴄᴏᴍᴍᴜɴɪᴛʏ: <a href=\'https://t.me/TeamMayhem\'>ᴍᴀʏʜᴇᴍ</a>\n›› ᴏᴡɴᴇʀ: <a href=\'https://t.me/NaapaExtra\'>ɴᴀᴘᴀᴇxᴛʀᴀ</a>\n›› ʟᴀɴɢᴜᴀɢᴇ: <a href=\'https://nodejs.org\'>Node.js</a>\n›› ꜰʀᴀᴍᴇᴡᴏʀᴋ: Cloudflare Workers\n›› ᴅᴀᴛᴀʙᴀsᴇ: <a href=\'https://www.mongodb.com/docs/\'>ᴍᴏɴɢᴏ ᴅʙ</a>\n›› ᴅᴇᴠᴇʟᴏᴘᴇʀ: <a href=\'https://t.me/NaapaExtra\'>ɴᴀᴘᴀᴇxᴛʀᴀ</a></b>',
  HELP: '<blockquote expandable><b>➪ I ᴀᴍ ᴀ ᴘʀɪᴠᴀᴛᴇ ғɪʟᴇ sʜᴀʀɪɴɢ ʙᴏᴛ, ᴍᴇᴀɴᴛ ᴛᴏ ᴘʀᴏᴠɪᴅᴇ ғɪʟᴇs ᴀɴᴅ ɴᴇᴄᴇssᴀʀʏ sᴛᴜғғ ᴛʜʀᴏᴜɢʜ sᴘᴇᴄɪᴀʟ ʟɪɴᴋ ғᴏʀ <a href=\'https://t.me/animes_mayhem\'>ᴀɴɪᴍᴇ ᴍᴀʏʜᴇᴍ</a>.\n\n➪ Iɴ ᴏʀᴅᴇʀ ᴛᴏ ɢᴇᴛ ᴛʜᴇ ғɪʟᴇs ʏᴏᴜ ʜᴀᴠᴇ ᴛᴏ ᴊᴏɪɴ ᴛʜᴇ ᴀʟʟ ᴍᴇɴᴛɪᴏɴᴇᴅ ᴄʜᴀɴɴᴇʟ ᴛʜᴀᴛ ɪ ᴘʀᴏᴠɪᴅᴇ ʏᴏᴜ ᴛᴏ ᴊᴏɪɴ.\n\n‣ /help - Oᴘᴇɴ ᴛʜɪs ʜᴇʟᴘ ᴍᴇssᴀɢᴇ !</b></blockquote>',
  REPLY: '<b>ʙᴀᴋᴋᴀ ! ʏᴏᴜ ᴀʀᴇ ɴᴏᴛ ᴍʏ ꜱᴇɴᴘᴀɪ!!</b>',
  SUPPORT_GRP: 'https://t.me/WeebsCloud',
  OWNER_URL: 'https://t.me/NaapaExtraa',
  NETWORK_URL: 'https://t.me/TeamMayhem',
  START_PHOTO: 'https://graph.org/file/0124e3b6eea95771bfda9-b41522117d67905955.jpg',
  ABOUT_PHOTO: 'https://graph.org/file/4fd0d66ef084773caf33b-c5b18273e9f07cd7d7.jpg',
  FSUB_PHOTO: 'https://graph.org/file/d48f3b1c7b41495ce1a0c-4d87ff09137971e900.jpg',
  SHORTNER_PHOTO: 'https://graph.org/file/d48f3b1c7b41495ce1a0c-4d87ff09137971e900.jpg',
  SHORT: 'https://graph.org/file/d48f3b1c7b41495ce1a0c-4d87ff09137971e900.jpg',
  PREMIUM_CONTACT: 'https://t.me/Naapaextraa',
  SHORTNER_MSG: '<b>⌯ Here is Your Download Link, Must Watch Tutorial Before Clicking On Download</b>',
  APPROVAL_PHOTO: 'https://graph.org/file/a56adfdad87ab7e1e326f-10b00b33842346f3a6.jpg',
  APPROVAL_WELCOME_TEXT: '<b>ʜᴇʏ {mention},</b>\n\n<blockquote><b>ʏᴏᴜʀ ʀᴇǫᴜᴇsᴛ ᴛᴏ ᴊᴏɪɴ {chat_title} ʜᴀs ʙᴇᴇɴ ᴀᴘᴘʀᴏᴠᴇᴅ.</b></blockquote>',
  APPROVAL_BUTTONS: [
    [{ text: '• ᴊᴏɪɴ ᴍʏ ᴜᴘᴅᴀᴛᴇꜱ •', url: 'https://t.me/realm_bots' }],
    [{ text: '• ᴊᴏɪɴ ᴀɴɪᴍᴇ ᴍᴀʏʜᴇᴍ •', url: 'https://t.me/animes_mayhem' }],
  ],
};

// ─── Build initial settings from env + defaults ───

export function buildDefaultSettings(env: Env): BotSettings {
  const ownerId = parseInt(env.OWNER_ID, 10);
  
  // Parse ADMINS from env (comma-separated string)
  let extraAdmins: number[] = [];
  if (env.ADMINS) {
    extraAdmins = env.ADMINS.split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(n => !isNaN(n));
  }

  // Parse DB_CHANNEL from env
  const dbChannel = env.DB_CHANNEL ? parseInt(env.DB_CHANNEL.trim(), 10) : 0;

  return {
    admins: [...new Set([ownerId, ...extraAdmins])],
    owner_id: ownerId,
    messages: { ...DEFAULT_MESSAGES },
    fsubs: [],
    fsub_dict: {},
    databases: { primary: dbChannel, secondary: [], backup: null },
    auto_del: parseInt(env.AUTO_DEL, 10) || 600,
    protect: env.PROTECT_CONTENT === 'true',
    disable_btn: env.DISABLE_BTN === 'true',
    reply_text: DEFAULT_MESSAGES.REPLY,
    short_url: env.SHORT_URL || 'arolinks.com',
    short_api: env.SHORT_API || '',
    shortner_enabled: true,
    tutorial_link: 'https://t.me/+zYJNXKoRIGs5YmY1',
    auto_approval_enabled: false,
    approval_delay: 5,
    credit_system_enabled: false,
    credits_per_visit: 1,
    credits_per_file: 1,
    max_credit_limit: 100,
    hide_caption: false,
    channel_button_enabled: false,
    button_name: 'Join Updates',
    button_url: 'https://t.me/realm_bots',
    bot_username: '',
    req_channels: [],
    all_db_ids: [],
  };
}

// ─── Load & merge settings from MongoDB ───

export async function loadSettings(env: Env, db: any): Promise<BotSettings> {
  const settings = buildDefaultSettings(env);

  // Load global config (modern settings)
  const globalConfig = await db.loadBotSetting('global_config');
  if (globalConfig) {
    if (globalConfig.protect_content !== undefined) settings.protect = globalConfig.protect_content;
    if (globalConfig.hide_caption !== undefined) settings.hide_caption = globalConfig.hide_caption;
    if (globalConfig.channel_button_enabled !== undefined) settings.channel_button_enabled = globalConfig.channel_button_enabled;
    if (globalConfig.button_name) settings.button_name = globalConfig.button_name;
    if (globalConfig.button_url) settings.button_url = globalConfig.button_url;
    if (globalConfig.auto_approval_enabled !== undefined) settings.auto_approval_enabled = globalConfig.auto_approval_enabled;
    if (globalConfig.approval_delay !== undefined) settings.approval_delay = globalConfig.approval_delay;
    if (globalConfig.shortner_enabled !== undefined) settings.shortner_enabled = globalConfig.shortner_enabled;
    if (globalConfig.short_url) settings.short_url = globalConfig.short_url;
    if (globalConfig.short_api) settings.short_api = globalConfig.short_api;
    if (globalConfig.tutorial_link) settings.tutorial_link = globalConfig.tutorial_link;
    if (globalConfig.credit_system_enabled !== undefined) settings.credit_system_enabled = globalConfig.credit_system_enabled;
    if (globalConfig.credits_per_visit !== undefined) settings.credits_per_visit = globalConfig.credits_per_visit;
    if (globalConfig.credits_per_file !== undefined) settings.credits_per_file = globalConfig.credits_per_file;
    if (globalConfig.max_credit_limit !== undefined) settings.max_credit_limit = globalConfig.max_credit_limit;
  }

  // Load legacy settings
  const legacySettings = await db.loadLegacySettings();
  if (legacySettings) {
    // Merge messages
    const savedMessages = legacySettings.messages || {};
    for (const [key, value] of Object.entries(savedMessages)) {
      if (value) settings.messages[key] = value;
    }
    // Merge admins
    const savedAdmins: number[] = legacySettings.admins || [];
    settings.admins = [...new Set([...settings.admins, ...savedAdmins, settings.owner_id])];
    // Merge fsubs
    if (legacySettings.fsub) settings.fsubs = legacySettings.fsub;
    // Merge databases
    if (legacySettings.databases) {
      settings.databases = legacySettings.databases;
    }
    if (legacySettings.auto_del !== undefined) settings.auto_del = legacySettings.auto_del;
    if (legacySettings.disable_btn !== undefined) settings.disable_btn = legacySettings.disable_btn;
    if (legacySettings.reply_text) settings.reply_text = legacySettings.reply_text;
  }

  // Build derived fields
  settings.all_db_ids = [
    settings.databases.primary,
    ...settings.databases.secondary,
  ].filter(Boolean);

  settings.req_channels = settings.fsubs
    .filter(f => f.request)
    .map(f => f.channel_id);

  return settings;
}

// ─── Format message template with user data ───

export function formatMessage(template: string, user: { id: number; first_name: string; last_name?: string; username?: string }, extra: Record<string, string> = {}): string {
  const mention = `<a href="tg://user?id=${user.id}">${escapeHtml(user.first_name)}</a>`;
  let result = template
    .replace(/{first}/g, escapeHtml(user.first_name))
    .replace(/{last}/g, escapeHtml(user.last_name || ''))
    .replace(/{username}/g, user.username ? `@${user.username}` : 'None')
    .replace(/{mention}/g, mention)
    .replace(/{id}/g, String(user.id));

  for (const [key, value] of Object.entries(extra)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return result;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
