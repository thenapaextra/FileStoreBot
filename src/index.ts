// ─── Cloudflare Worker Entry Point ───

import type { Env, TelegramUpdate, BotContext } from './types';
import { Telegram } from './telegram';
import { Database } from './db/d1';
import { loadSettings } from './config';
import { routeUpdate } from './bot/router';
import { processAutoDeleteCron } from './bot/handlers/autoDel';
import { processBroadcastCron } from './bot/handlers/broadcast';
import { logger } from './utils/logger';

// ─── Settings Cache (within isolate) ───

let cachedSettings: { data: any; timestamp: number } | null = null;
const SETTINGS_CACHE_TTL = 60_000; // 1 minute

async function getSettings(env: Env, db: Database) {
  if (cachedSettings && Date.now() - cachedSettings.timestamp < SETTINGS_CACHE_TTL) {
    return cachedSettings.data;
  }
  const settings = await loadSettings(env, db);
  cachedSettings = { data: settings, timestamp: Date.now() };
  return settings;
}

// ─── Worker Export ───

export default {
  // ─── Webhook Handler (incoming Telegram updates) ───

  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('Lelouch Bot — Running on Cloudflare Workers', { status: 200 });
    }

    // Webhook setup endpoint
    if (url.pathname === '/setup-webhook' && request.method === 'GET') {
      const api = new Telegram(env.BOT_TOKEN);
      const webhookUrl = `${url.origin}/webhook`;
      try {
        await api.setWebhook(webhookUrl, {
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ['message', 'callback_query', 'channel_post', 'chat_join_request'],
          drop_pending_updates: true,
        });

        const me = await api.getMe();

        return new Response(JSON.stringify({
          ok: true,
          webhook_url: webhookUrl,
          bot: me,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Webhook endpoint
    if (url.pathname === '/webhook' && request.method === 'POST') {
      const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (env.WEBHOOK_SECRET && secretHeader !== env.WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }

      let update: TelegramUpdate;
      try {
        update = await request.json() as TelegramUpdate;
      } catch {
        return new Response('Bad Request', { status: 400 });
      }

      executionCtx.waitUntil(processUpdate(update, env));

      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },

  // ─── Cron Trigger (auto-delete + broadcast processing) ───

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCronJobs(env));
  },
};

// ─── Process a single Telegram update ───

async function processUpdate(update: TelegramUpdate, env: Env) {
  try {
    const db = new Database(env.DB, env.SESSION_NAME || 'bot 1');
    const api = new Telegram(env.BOT_TOKEN);
    const settings = await getSettings(env, db);

    // Get bot username if not cached
    if (!settings.bot_username) {
      try {
        const me = await api.getMe();
        settings.bot_username = me.username || '';
      } catch {}
    }

    // Build FSub dict (channel info) on first load
    if (settings.fsubs.length > 0 && Object.keys(settings.fsub_dict).length === 0) {
      for (const fsub of settings.fsubs) {
        try {
          const chat = await api.getChat(fsub.channel_id);
          let inviteLink: string | null = null;
          if (fsub.timer <= 0) {
            try {
              const invite = await api.createChatInviteLink(fsub.channel_id, { creates_join_request: fsub.request });
              inviteLink = invite.invite_link;
            } catch {}
          }
          settings.fsub_dict[fsub.channel_id] = {
            name: chat.title || `Channel ${fsub.channel_id}`,
            invite_link: inviteLink,
            request: fsub.request,
            timer: fsub.timer,
          };
        } catch (e: any) {
          logger.warn('index', `Could not load fsub channel ${fsub.channel_id}: ${e.message}`);
          settings.fsub_dict[fsub.channel_id] = {
            name: `Channel ${fsub.channel_id}`,
            invite_link: null,
            request: fsub.request,
            timer: fsub.timer,
          };
        }
      }
    }

    const ctx: BotContext = { env, api: api as any, db, update, settings };
    await routeUpdate(ctx);
  } catch (error: any) {
    logger.error('index', `Failed to process update: ${error.message}`, { stack: error.stack });
  }
}

// ─── Cron Jobs (runs every minute) ───

async function runCronJobs(env: Env) {
  try {
    await processAutoDeleteCron(env);
  } catch (e: any) {
    logger.error('cron', `Auto-delete cron error: ${e.message}`);
  }

  try {
    await processBroadcastCron(env);
  } catch (e: any) {
    logger.error('cron', `Broadcast cron error: ${e.message}`);
  }
}
