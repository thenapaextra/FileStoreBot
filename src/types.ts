// ─── Telegram Bot API Type Definitions ───

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  channel_post?: TelegramMessage;
  chat_join_request?: TelegramChatJoinRequest;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  video?: TelegramVideo;
  caption?: string;
  caption_entities?: any[];
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_origin?: TelegramForwardOrigin;
  reply_to_message?: TelegramMessage;
  reply_markup?: TelegramInlineKeyboardMarkup;
  media_group_id?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  invite_link?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramChatJoinRequest {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  invite_link?: any;
}

export interface TelegramChatMember {
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  user: TelegramUser;
  can_invite_users?: boolean;
  can_delete_messages?: boolean;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramForwardOrigin {
  type: string;
  chat?: TelegramChat;
  message_id?: number;
}

// ─── Worker Environment Bindings ───

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  MONGODB_URI: string;
  WEBHOOK_SECRET: string;
  OWNER_ID: string;
  DB_NAME: string;
  SHORT_URL: string;
  SHORT_API: string;
  AUTO_DEL: string;
  PROTECT_CONTENT: string;
  DISABLE_BTN: string;
  SESSION_NAME: string;
  ADMINS: string;
  DB_CHANNEL: string;
}

// ─── Bot Internal Types ───

export interface BotSettings {
  admins: number[];
  owner_id: number;
  messages: Record<string, any>;
  fsubs: FSubEntry[];
  fsub_dict: Record<number, FSubChannelInfo>;
  databases: { primary: number; secondary: number[]; backup: number | null };
  auto_del: number;
  protect: boolean;
  disable_btn: boolean;
  reply_text: string;
  short_url: string;
  short_api: string;
  shortner_enabled: boolean;
  tutorial_link: string;
  auto_approval_enabled: boolean;
  approval_delay: number;
  credit_system_enabled: boolean;
  credits_per_visit: number;
  credits_per_file: number;
  max_credit_limit: number;
  hide_caption: boolean;
  channel_button_enabled: boolean;
  button_name: string;
  button_url: string;
  bot_username: string;
  req_channels: number[];
  all_db_ids: number[];
}

export interface FSubEntry {
  channel_id: number;
  request: boolean;
  timer: number;
}

export interface FSubChannelInfo {
  name: string;
  invite_link: string | null;
  request: boolean;
  timer: number;
}

export interface BotContext {
  env: Env;
  api: TelegramAPI;
  db: any; // Database instance
  update: TelegramUpdate;
  settings: BotSettings;
}

// Forward declaration for TelegramAPI (implemented in telegram.ts)
export interface TelegramAPI {
  sendMessage(chatId: number, text: string, opts?: any): Promise<any>;
  sendPhoto(chatId: number, photo: string, opts?: any): Promise<any>;
  editMessageText(chatId: number, messageId: number, text: string, opts?: any): Promise<any>;
  editMessageCaption(chatId: number, messageId: number, caption: string, opts?: any): Promise<any>;
  editMessageMedia(chatId: number, messageId: number, media: any, opts?: any): Promise<any>;
  editMessageReplyMarkup(chatId: number, messageId: number, markup?: TelegramInlineKeyboardMarkup): Promise<any>;
  answerCallbackQuery(queryId: string, opts?: any): Promise<any>;
  deleteMessage(chatId: number, messageId: number): Promise<any>;
  copyMessage(chatId: number, fromChatId: number, messageId: number, opts?: any): Promise<any>;
  getChatMember(chatId: number, userId: number): Promise<TelegramChatMember>;
  getChat(chatId: number): Promise<TelegramChat>;
  createChatInviteLink(chatId: number, opts?: any): Promise<any>;
  revokeChatInviteLink(chatId: number, inviteLink: string): Promise<any>;
  approveChatJoinRequest(chatId: number, userId: number): Promise<any>;
  setWebhook(url: string, opts?: any): Promise<any>;
  getMe(): Promise<any>;
  request(method: string, data?: any): Promise<any>;
}
