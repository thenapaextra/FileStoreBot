// ─── Telegram Bot API Wrapper (pure fetch, zero deps) ───

import type { TelegramInlineKeyboardMarkup, TelegramChatMember, TelegramChat } from './types';
import { logger } from './utils/logger';

export class TelegramError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'TelegramError';
  }
}

export class Telegram {
  private baseUrl: string;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  private async request(method: string, params: Record<string, any> = {}): Promise<any> {
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) body[k] = v;
    }

    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as any;
    if (!json.ok) {
      const errMsg = json.description || 'Unknown Telegram API error';
      const errCode = json.error_code || res.status;
      logger.error('telegram', `API error on ${method}: ${errMsg}`, { code: errCode, params: body });
      throw new TelegramError(errMsg, errCode);
    }
    return json.result;
  }

  // ─── Messages ───

  async sendMessage(chatId: number, text: string, opts: {
    parse_mode?: string;
    reply_markup?: TelegramInlineKeyboardMarkup;
    disable_web_page_preview?: boolean;
    protect_content?: boolean;
  } = {}) {
    return this.request('sendMessage', { chat_id: chatId, text, ...opts });
  }

  async sendPhoto(chatId: number, photo: string, opts: {
    caption?: string;
    parse_mode?: string;
    reply_markup?: TelegramInlineKeyboardMarkup;
    protect_content?: boolean;
  } = {}) {
    return this.request('sendPhoto', { chat_id: chatId, photo, ...opts });
  }

  async copyMessage(chatId: number, fromChatId: number, messageId: number, opts: {
    caption?: string;
    parse_mode?: string;
    reply_markup?: TelegramInlineKeyboardMarkup;
    protect_content?: boolean;
    disable_notification?: boolean;
  } = {}) {
    return this.request('copyMessage', {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      ...opts,
    });
  }

  async deleteMessage(chatId: number, messageId: number) {
    return this.request('deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => null);
  }

  // ─── Edit ───

  async editMessageText(chatId: number, messageId: number, text: string, opts: {
    parse_mode?: string;
    reply_markup?: TelegramInlineKeyboardMarkup;
    disable_web_page_preview?: boolean;
  } = {}) {
    return this.request('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...opts,
    });
  }

  async editMessageCaption(chatId: number, messageId: number, caption: string, opts: {
    parse_mode?: string;
    reply_markup?: TelegramInlineKeyboardMarkup;
  } = {}) {
    return this.request('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption,
      ...opts,
    });
  }

  async editMessageMedia(chatId: number, messageId: number, media: any, opts: {
    reply_markup?: TelegramInlineKeyboardMarkup;
  } = {}) {
    return this.request('editMessageMedia', {
      chat_id: chatId,
      message_id: messageId,
      media,
      ...opts,
    });
  }

  async editMessageReplyMarkup(chatId: number, messageId: number, replyMarkup?: TelegramInlineKeyboardMarkup) {
    return this.request('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  }

  // ─── Callbacks ───

  async answerCallbackQuery(queryId: string, opts: {
    text?: string;
    show_alert?: boolean;
  } = {}) {
    return this.request('answerCallbackQuery', { callback_query_id: queryId, ...opts });
  }

  // ─── Chat ───

  async getChat(chatId: number): Promise<TelegramChat> {
    return this.request('getChat', { chat_id: chatId });
  }

  async getChatMember(chatId: number, userId: number): Promise<TelegramChatMember> {
    return this.request('getChatMember', { chat_id: chatId, user_id: userId });
  }

  async createChatInviteLink(chatId: number, opts: {
    expire_date?: number;
    creates_join_request?: boolean;
  } = {}) {
    return this.request('createChatInviteLink', { chat_id: chatId, ...opts });
  }

  async revokeChatInviteLink(chatId: number, inviteLink: string) {
    return this.request('revokeChatInviteLink', { chat_id: chatId, invite_link: inviteLink }).catch(() => null);
  }

  async approveChatJoinRequest(chatId: number, userId: number) {
    return this.request('approveChatJoinRequest', { chat_id: chatId, user_id: userId });
  }

  // ─── Webhook ───

  async setWebhook(url: string, opts: {
    secret_token?: string;
    allowed_updates?: string[];
    drop_pending_updates?: boolean;
  } = {}) {
    return this.request('setWebhook', { url, ...opts });
  }

  async getMe() {
    return this.request('getMe');
  }
}
