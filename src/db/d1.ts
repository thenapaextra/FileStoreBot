// ─── Cloudflare D1 Native Implementation ───

import { logger } from '../utils/logger';

export class Database {
  private db: D1Database;
  private sessionName: string;

  constructor(database: D1Database, sessionName: string = 'bot 1') {
    this.db = database;
    this.sessionName = sessionName;
  }

  // ─── Users ───

  async presentUser(userId: number): Promise<boolean> {
    const res = await this.db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    return !!res;
  }

  async addUser(userId: number, ban = false) {
    await this.db.prepare('INSERT OR IGNORE INTO users (id, ban, credits) VALUES (?, ?, 0)')
      .bind(userId, ban ? 1 : 0).run();
  }

  async fullUserbase(): Promise<number[]> {
    const res = await this.db.prepare('SELECT id FROM users').all();
    return res.results.map((d: any) => d.id as number);
  }

  async delUser(userId: number) {
    await this.db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  }

  async isBanned(userId: number): Promise<boolean> {
    const res = await this.db.prepare('SELECT ban FROM users WHERE id = ?').bind(userId).first();
    return res ? (res.ban === 1) : false;
  }

  async banUser(userId: number) {
    await this.db.prepare('UPDATE users SET ban = 1 WHERE id = ?').bind(userId).run();
  }

  async unbanUser(userId: number) {
    await this.db.prepare('UPDATE users SET ban = 0 WHERE id = ?').bind(userId).run();
  }

  // ─── Credits ───

  async getCredits(userId: number): Promise<number> {
    const res = await this.db.prepare('SELECT credits FROM users WHERE id = ?').bind(userId).first();
    return res ? (res.credits as number) : 0;
  }

  async updateCredits(userId: number, amount: number) {
    await this.db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(amount, userId).run();
    // In case user didn't exist
    await this.db.prepare('INSERT OR IGNORE INTO users (id, credits) VALUES (?, ?)').bind(userId, Math.max(0, amount)).run();
  }

  async setCredits(userId: number, amount: number) {
    await this.db.prepare('UPDATE users SET credits = ? WHERE id = ?').bind(amount, userId).run();
    await this.db.prepare('INSERT OR IGNORE INTO users (id, credits) VALUES (?, ?)').bind(userId, amount).run();
  }

  // ─── Bot Settings ───

  async loadBotSetting(key: string): Promise<any> {
    const res = await this.db.prepare('SELECT settings FROM bot_settings WHERE id = ?').bind(key).first();
    return res ? JSON.parse(res.settings as string) : null;
  }

  async saveBotSetting(key: string, value: any) {
    const existing = await this.loadBotSetting('global_config') || {};
    existing[key] = value;
    await this.db.prepare('INSERT INTO bot_settings (id, settings) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET settings=excluded.settings')
      .bind('global_config', JSON.stringify(existing)).run();
  }

  async saveSettings(settings: any) {
    await this.db.prepare('INSERT INTO bot_settings (id, settings) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET settings=excluded.settings')
      .bind(this.sessionName, JSON.stringify(settings)).run();
  }

  async loadLegacySettings(): Promise<any> {
    const res = await this.db.prepare('SELECT settings FROM bot_settings WHERE id = ?').bind(this.sessionName).first();
    return res ? JSON.parse(res.settings as string) : null;
  }

  // ─── Batch Links ───

  async saveBatch(channelId: number, fileIds: number[]): Promise<string> {
    const key = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    await this.db.prepare('INSERT INTO batch_links (id, channel_id, ids) VALUES (?, ?, ?)')
      .bind(key, channelId, JSON.stringify(fileIds)).run();
    return key;
  }

  async getBatch(key: string): Promise<{ channelId: number; ids: number[] } | null> {
    const res = await this.db.prepare('SELECT channel_id, ids FROM batch_links WHERE id = ?').bind(key).first();
    if (res) {
      return { channelId: res.channel_id as number, ids: JSON.parse(res.ids as string) };
    }
    return null;
  }

  // ─── Premium Users ───

  async isPro(userId: number): Promise<boolean> {
    const res = await this.db.prepare('SELECT expiry_date FROM pros WHERE id = ?').bind(userId).first();
    if (!res) return false;
    if (res.expiry_date === null) return true; // permanent
    return new Date(res.expiry_date as number) > new Date();
  }

  async addPro(userId: number, expiryDate: Date | null = null) {
    const exp = expiryDate ? expiryDate.getTime() : null;
    await this.db.prepare('INSERT INTO pros (id, expiry_date) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET expiry_date=excluded.expiry_date')
      .bind(userId, exp).run();
  }

  async removePro(userId: number) {
    await this.db.prepare('DELETE FROM pros WHERE id = ?').bind(userId).run();
  }

  async getProsList(): Promise<number[]> {
    const now = Date.now();
    const res = await this.db.prepare('SELECT id FROM pros WHERE expiry_date IS NULL OR expiry_date > ?').bind(now).all();
    return res.results.map((d: any) => d.id as number);
  }

  async getExpiryDate(userId: number): Promise<Date | null> {
    const res = await this.db.prepare('SELECT expiry_date FROM pros WHERE id = ?').bind(userId).first();
    if (res && res.expiry_date) return new Date(res.expiry_date as number);
    return null;
  }

  // ─── Channel Data (FSub tracking) ───

  async setChannels(channels: number[]) {
    await this.db.prepare('INSERT INTO channels (id, channels) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET channels=excluded.channels')
      .bind(JSON.stringify(channels)).run();
  }

  async getChannels(): Promise<number[]> {
    const res = await this.db.prepare('SELECT channels FROM channels WHERE id = 1').first();
    return res && res.channels ? JSON.parse(res.channels as string) : [];
  }

  async addChannelUser(channelId: number, userId: number) {
    const res = await this.db.prepare('SELECT users FROM channels WHERE id = ?').bind(channelId).first();
    let users: number[] = res && res.users ? JSON.parse(res.users as string) : [];
    if (!users.includes(userId)) {
      users.push(userId);
      await this.db.prepare('INSERT INTO channels (id, users) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET users=excluded.users')
        .bind(channelId, JSON.stringify(users)).run();
    }
  }

  async removeChannelUser(channelId: number, userId: number) {
    const res = await this.db.prepare('SELECT users FROM channels WHERE id = ?').bind(channelId).first();
    let users: number[] = res && res.users ? JSON.parse(res.users as string) : [];
    if (users.includes(userId)) {
      users = users.filter(u => u !== userId);
      await this.db.prepare('UPDATE channels SET users = ? WHERE id = ?').bind(JSON.stringify(users), channelId).run();
    }
  }

  async isUserInChannel(channelId: number, userId: number): Promise<boolean> {
    const res = await this.db.prepare('SELECT users FROM channels WHERE id = ?').bind(channelId).first();
    let users: number[] = res && res.users ? JSON.parse(res.users as string) : [];
    return users.includes(userId);
  }

  // ─── Auto Approval ───

  async setAutoApproval(channelId: number, status: boolean) {
    if (status) {
      await this.db.prepare('INSERT INTO approval_config (id, enabled) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET enabled=1').bind(channelId).run();
    } else {
      await this.db.prepare('DELETE FROM approval_config WHERE id = ?').bind(channelId).run();
    }
  }

  async isAutoApprovalEnabled(channelId: number): Promise<boolean> {
    const res = await this.db.prepare('SELECT enabled FROM approval_config WHERE id = ?').bind(channelId).first();
    return !!(res && res.enabled === 1);
  }

  async getAutoApprovalChannels(): Promise<number[]> {
    const res = await this.db.prepare('SELECT id FROM approval_config WHERE enabled = 1').all();
    return res.results.map((d: any) => d.id as number);
  }

  // ─── Link Sharing ───

  async saveLinkChannel(channelId: number) {
    const res = await this.db.prepare('SELECT data FROM link_channels WHERE id = ?').bind('link_channels').first();
    let channels: number[] = res ? JSON.parse(res.data as string) : [];
    if (!channels.includes(channelId)) {
      channels.push(channelId);
      await this.db.prepare('INSERT INTO link_channels (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data')
        .bind('link_channels', JSON.stringify(channels)).run();
    }
  }

  async removeLinkChannel(channelId: number): Promise<boolean> {
    const res = await this.db.prepare('SELECT data FROM link_channels WHERE id = ?').bind('link_channels').first();
    let channels: number[] = res ? JSON.parse(res.data as string) : [];
    if (channels.includes(channelId)) {
      channels = channels.filter(c => c !== channelId);
      await this.db.prepare('UPDATE link_channels SET data = ? WHERE id = ?').bind(JSON.stringify(channels), 'link_channels').run();
      return true;
    }
    return false;
  }

  async getLinkChannels(): Promise<number[]> {
    const res = await this.db.prepare('SELECT data FROM link_channels WHERE id = ?').bind('link_channels').first();
    return res ? JSON.parse(res.data as string) : [];
  }

  async isLinkChannel(channelId: number): Promise<boolean> {
    const channels = await this.getLinkChannels();
    return channels.includes(channelId);
  }

  async saveInviteLink(channelId: number, inviteLink: string, isRequest: boolean) {
    const data = JSON.stringify({ invite_link: inviteLink, is_request: isRequest });
    await this.db.prepare('INSERT INTO link_channels (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data')
      .bind(`invite_${channelId}`, data).run();
  }

  async getCurrentInviteLink(channelId: number): Promise<{ invite_link: string; is_request: boolean } | null> {
    const res = await this.db.prepare('SELECT data FROM link_channels WHERE id = ?').bind(`invite_${channelId}`).first();
    if (res && res.data) {
      return JSON.parse(res.data as string);
    }
    return null;
  }

  // ─── Scheduled Deletions (auto-delete) ───

  async scheduleDeletion(chatId: number, messageIds: number[], deleteAt: Date, linkParam?: string) {
    await this.db.prepare('INSERT INTO scheduled_deletions (chat_id, message_ids, delete_at, link_param) VALUES (?, ?, ?, ?)')
      .bind(chatId, JSON.stringify(messageIds), deleteAt.getTime(), linkParam || null).run();
  }

  async getExpiredDeletions(): Promise<any[]> {
    const now = Date.now();
    const res = await this.db.prepare('SELECT * FROM scheduled_deletions WHERE delete_at <= ?').bind(now).all();
    return res.results.map((r: any) => ({
      ...r,
      message_ids: JSON.parse(r.message_ids),
      delete_at: new Date(r.delete_at)
    }));
  }

  async removeDeletion(id: number) {
    await this.db.prepare('DELETE FROM scheduled_deletions WHERE id = ?').bind(id).run();
  }

  // ─── Broadcast Tasks ───

  async createBroadcast(adminChatId: number, sourceChatId: number, sourceMessageId: number, statusMessageId: number): Promise<string> {
    const id = crypto.randomUUID();
    await this.db.prepare('INSERT INTO broadcast_tasks (id, admin_chat_id, source_chat_id, source_message_id, status_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, adminChatId, sourceChatId, sourceMessageId, statusMessageId, Date.now()).run();
    return id;
  }

  async getPendingBroadcast(): Promise<any> {
    const res = await this.db.prepare("SELECT * FROM broadcast_tasks WHERE status IN ('pending', 'running') LIMIT 1").first();
    return res;
  }

  async updateBroadcast(id: string, update: any) {
    const keys = Object.keys(update);
    if (keys.length === 0) return;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = keys.map(k => update[k]);
    vals.push(id);
    await this.db.prepare(`UPDATE broadcast_tasks SET ${sets} WHERE id = ?`).bind(...vals).run();
  }

  async incrementBroadcastCounters(id: string, counters: { successful?: number; blocked?: number; deleted?: number; unsuccessful?: number; total?: number }) {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [k, v] of Object.entries(counters)) {
      if (v) {
        sets.push(`${k} = ${k} + ?`);
        vals.push(v);
      }
    }
    if (sets.length > 0) {
      vals.push(id);
      await this.db.prepare(`UPDATE broadcast_tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
  }

  async getUsersAfter(afterId: number, limit: number): Promise<number[]> {
    const res = await this.db.prepare('SELECT id FROM users WHERE id > ? AND ban = 0 ORDER BY id ASC LIMIT ?')
      .bind(afterId, limit).all();
    return res.results.map((d: any) => d.id as number);
  }

  // ─── Pending Actions (stateless conversations) ───

  async setPendingAction(userId: number, action: string, data: any = {}) {
    const expiresAt = Date.now() + 90_000;
    await this.db.prepare('INSERT INTO pending_actions (id, action, data, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET action=excluded.action, data=excluded.data, expires_at=excluded.expires_at')
      .bind(userId, action, JSON.stringify(data), expiresAt).run();
  }

  async getPendingAction(userId: number): Promise<{ action: string; data: any } | null> {
    const res = await this.db.prepare('SELECT * FROM pending_actions WHERE id = ?').bind(userId).first();
    if (!res) return null;
    
    if (Date.now() > (res.expires_at as number)) {
      await this.deletePendingAction(userId);
      return null;
    }
    return { action: res.action as string, data: JSON.parse(res.data as string) };
  }

  async deletePendingAction(userId: number) {
    await this.db.prepare('DELETE FROM pending_actions WHERE id = ?').bind(userId).run();
  }
}
