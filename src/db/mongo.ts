// ─── MongoDB via native driver (Workers nodejs_compat) ───

import { MongoClient, type Db, type Collection } from 'mongodb';
import { logger } from '../utils/logger';

// ─── Connection Management ───

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(uri: string, dbName: string): Promise<Db> {
  if (db && client) {
    return db;
  }
  try {
    client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(dbName);
    logger.info('db', `Connected to MongoDB (${dbName})`);
    return db;
  } catch (err: any) {
    logger.error('db', `MongoDB connection error: ${err.message}`);
    throw err;
  }
}

// ─── Database Class ───

export class Database {
  private db: Db;
  private sessionName: string;

  constructor(database: Db, sessionName: string = 'bot 1') {
    this.db = database;
    this.sessionName = sessionName;
  }

  private col(name: string): Collection {
    return this.db.collection(name);
  }

  // ─── Users ───

  async presentUser(userId: number): Promise<boolean> {
    return !!(await this.col('users').findOne({ _id: userId as any }));
  }

  async addUser(userId: number, ban = false) {
    await this.col('users').updateOne(
      { _id: userId as any },
      { $setOnInsert: { ban, credits: 0 } },
      { upsert: true }
    );
  }

  async fullUserbase(): Promise<number[]> {
    const docs = await this.col('users').find({}, { projection: { _id: 1 } }).toArray();
    return docs.map((d: any) => d._id).filter((id: any) => typeof id === 'number');
  }

  async delUser(userId: number) {
    await this.col('users').deleteOne({ _id: userId as any });
  }

  async isBanned(userId: number): Promise<boolean> {
    const user = await this.col('users').findOne({ _id: userId as any });
    return (user as any)?.ban === true;
  }

  async banUser(userId: number) {
    await this.col('users').updateOne({ _id: userId as any }, { $set: { ban: true } });
  }

  async unbanUser(userId: number) {
    await this.col('users').updateOne({ _id: userId as any }, { $set: { ban: false } });
  }

  // ─── Credits ───

  async getCredits(userId: number): Promise<number> {
    const user = await this.col('users').findOne({ _id: userId as any });
    return (user as any)?.credits ?? 0;
  }

  async updateCredits(userId: number, amount: number) {
    await this.col('users').updateOne(
      { _id: userId as any },
      { $inc: { credits: amount } },
      { upsert: true }
    );
  }

  async setCredits(userId: number, amount: number) {
    await this.col('users').updateOne(
      { _id: userId as any },
      { $set: { credits: amount } },
      { upsert: true }
    );
  }

  // ─── Bot Settings ───

  async loadBotSetting(key: string): Promise<any> {
    return await this.col('bot_settings').findOne({ _id: key as any });
  }

  async saveBotSetting(key: string, value: any) {
    await this.col('bot_settings').updateOne(
      { _id: 'global_config' as any },
      { $set: { [key]: value } },
      { upsert: true }
    );
  }

  async saveSettings(settings: any) {
    await this.col('bot_settings').updateOne(
      { _id: this.sessionName as any },
      { $set: { settings } },
      { upsert: true }
    );
  }

  async loadLegacySettings(): Promise<any> {
    const doc = await this.col('bot_settings').findOne({ _id: this.sessionName as any });
    return (doc as any)?.settings || null;
  }

  // ─── Batch Links ───

  async saveBatch(channelId: number, fileIds: number[]): Promise<string> {
    const key = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    await this.col('batch_links').insertOne({ _id: key as any, channel_id: channelId, ids: fileIds });
    return key;
  }

  async getBatch(key: string): Promise<{ channelId: number; ids: number[] } | null> {
    const doc = await this.col('batch_links').findOne({ _id: key as any });
    return doc ? { channelId: (doc as any).channel_id, ids: (doc as any).ids } : null;
  }

  // ─── Premium Users ───

  async isPro(userId: number): Promise<boolean> {
    const doc = await this.col('pros').findOne({ _id: userId as any });
    if (!doc) return false;
    if (!(doc as any).expiry_date) return true;
    return new Date((doc as any).expiry_date) > new Date();
  }

  async addPro(userId: number, expiryDate: Date | null = null) {
    await this.col('pros').updateOne(
      { _id: userId as any },
      { $set: { expiry_date: expiryDate } },
      { upsert: true }
    );
  }

  async removePro(userId: number) {
    await this.col('pros').deleteOne({ _id: userId as any });
  }

  async getProsList(): Promise<number[]> {
    const now = new Date();
    const docs = await this.col('pros').find({
      $or: [
        { expiry_date: null },
        { expiry_date: { $exists: false } },
        { expiry_date: { $gt: now } },
      ],
    }).toArray();
    return docs.map((d: any) => d._id);
  }

  async getExpiryDate(userId: number): Promise<Date | null> {
    const doc = await this.col('pros').findOne({ _id: userId as any });
    return (doc as any)?.expiry_date || null;
  }

  // ─── Channel Data (FSub tracking) ───

  async setChannels(channels: number[]) {
    await this.col('channels').updateOne(
      { _id: 1 as any },
      { $set: { channels } },
      { upsert: true }
    );
  }

  async getChannels(): Promise<number[]> {
    const doc = await this.col('channels').findOne({ _id: 1 as any });
    return (doc as any)?.channels || [];
  }

  async addChannelUser(channelId: number, userId: number) {
    await this.col('channels').updateOne(
      { _id: channelId as any },
      { $addToSet: { users: userId } },
      { upsert: true }
    );
  }

  async removeChannelUser(channelId: number, userId: number) {
    await this.col('channels').updateOne(
      { _id: channelId as any },
      { $pull: { users: userId } as any }
    );
  }

  async isUserInChannel(channelId: number, userId: number): Promise<boolean> {
    const doc = await this.col('channels').findOne(
      { _id: channelId as any, users: { $in: [userId] } },
      { projection: { _id: 1 } }
    );
    return !!doc;
  }

  // ─── Auto Approval ───

  async setAutoApproval(channelId: number, status: boolean) {
    if (status) {
      await this.col('approval_config').updateOne({ _id: channelId as any }, { $set: { enabled: true } }, { upsert: true });
    } else {
      await this.col('approval_config').deleteOne({ _id: channelId as any });
    }
  }

  async isAutoApprovalEnabled(channelId: number): Promise<boolean> {
    return !!(await this.col('approval_config').findOne({ _id: channelId as any }));
  }

  async getAutoApprovalChannels(): Promise<number[]> {
    const docs = await this.col('approval_config').find({ enabled: true }).toArray();
    return docs.map((d: any) => d._id);
  }

  // ─── Link Sharing ───

  async saveLinkChannel(channelId: number) {
    await this.col('users').updateOne(
      { _id: 'link_channels' as any },
      { $addToSet: { channels: channelId } },
      { upsert: true }
    );
  }

  async removeLinkChannel(channelId: number): Promise<boolean> {
    const result = await this.col('users').updateOne(
      { _id: 'link_channels' as any },
      { $pull: { channels: channelId } as any }
    );
    return result.modifiedCount > 0;
  }

  async getLinkChannels(): Promise<number[]> {
    const doc = await this.col('users').findOne({ _id: 'link_channels' as any });
    return (doc as any)?.channels || [];
  }

  async isLinkChannel(channelId: number): Promise<boolean> {
    const doc = await this.col('users').findOne(
      { _id: 'link_channels' as any, channels: { $in: [channelId] } }
    );
    return !!doc;
  }

  async saveInviteLink(channelId: number, inviteLink: string, isRequest: boolean) {
    await this.col('users').updateOne(
      { _id: `invite_${channelId}` as any },
      { $set: { invite_link: inviteLink, is_request: isRequest, created_at: new Date() } },
      { upsert: true }
    );
  }

  async getCurrentInviteLink(channelId: number): Promise<{ invite_link: string; is_request: boolean } | null> {
    const doc = await this.col('users').findOne({ _id: `invite_${channelId}` as any });
    return doc ? { invite_link: (doc as any).invite_link, is_request: (doc as any).is_request ?? false } : null;
  }

  // ─── Scheduled Deletions (auto-delete) ───

  async scheduleDeletion(chatId: number, messageIds: number[], deleteAt: Date, linkParam?: string) {
    await this.col('scheduled_deletions').insertOne({
      chat_id: chatId,
      message_ids: messageIds,
      delete_at: deleteAt,
      link_param: linkParam || null,
    });
  }

  async getExpiredDeletions(): Promise<any[]> {
    return this.col('scheduled_deletions').find({ delete_at: { $lte: new Date() } }).toArray();
  }

  async removeDeletion(id: any) {
    await this.col('scheduled_deletions').deleteOne({ _id: id });
  }

  // ─── Broadcast Tasks ───

  async createBroadcast(adminChatId: number, sourceChatId: number, sourceMessageId: number, statusMessageId: number): Promise<string> {
    const result = await this.col('broadcast_tasks').insertOne({
      admin_chat_id: adminChatId,
      source_chat_id: sourceChatId,
      source_message_id: sourceMessageId,
      status_message_id: statusMessageId,
      status: 'pending',
      total: 0,
      successful: 0,
      blocked: 0,
      deleted: 0,
      unsuccessful: 0,
      last_user_id: 0,
      created_at: new Date(),
    });
    return result.insertedId.toString();
  }

  async getPendingBroadcast(): Promise<any> {
    return this.col('broadcast_tasks').findOne({
      status: { $in: ['pending', 'running'] },
    });
  }

  async updateBroadcast(id: any, update: any) {
    await this.col('broadcast_tasks').updateOne({ _id: id }, { $set: update });
  }

  async incrementBroadcastCounters(id: any, counters: { successful?: number; blocked?: number; deleted?: number; unsuccessful?: number; total?: number }) {
    const incFields: Record<string, number> = {};
    for (const [k, v] of Object.entries(counters)) {
      if (v) incFields[k] = v;
    }
    await this.col('broadcast_tasks').updateOne({ _id: id }, { $inc: incFields });
  }

  async getUsersAfter(afterId: number, limit: number): Promise<number[]> {
    const docs = await this.col('users').find(
      { _id: { $gt: afterId } as any, ban: { $ne: true } },
      { projection: { _id: 1 } }
    ).sort({ _id: 1 }).limit(limit).toArray();
    return docs.map((d: any) => d._id).filter((id: any) => typeof id === 'number');
  }

  // ─── Pending Actions (stateless conversations) ───

  async setPendingAction(userId: number, action: string, data: any = {}) {
    await this.col('pending_actions').updateOne(
      { _id: userId as any },
      { $set: { action, data, expires_at: new Date(Date.now() + 90_000) } },
      { upsert: true }
    );
  }

  async getPendingAction(userId: number): Promise<{ action: string; data: any } | null> {
    const doc = await this.col('pending_actions').findOne({ _id: userId as any });
    if (!doc) return null;
    if (new Date((doc as any).expires_at) < new Date()) {
      await this.col('pending_actions').deleteOne({ _id: userId as any });
      return null;
    }
    return { action: (doc as any).action, data: (doc as any).data };
  }

  async deletePendingAction(userId: number) {
    await this.col('pending_actions').deleteOne({ _id: userId as any });
  }
}
