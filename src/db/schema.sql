-- ─── Cloudflare D1 Database Schema ───

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  ban INTEGER DEFAULT 0,
  credits INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bot_settings (
  id TEXT PRIMARY KEY,
  settings TEXT -- JSON string
);

CREATE TABLE IF NOT EXISTS batch_links (
  id TEXT PRIMARY KEY,
  channel_id INTEGER,
  ids TEXT -- JSON string array of numbers
);

CREATE TABLE IF NOT EXISTS pros (
  id INTEGER PRIMARY KEY,
  expiry_date INTEGER -- Unix timestamp (milliseconds), or NULL for permanent
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY,
  channels TEXT, -- JSON string array of channel IDs (for FSub dict keys)
  users TEXT     -- JSON string array of user IDs
);

CREATE TABLE IF NOT EXISTS approval_config (
  id INTEGER PRIMARY KEY,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS link_channels (
  id TEXT PRIMARY KEY, -- Special key like "link_channels" or "invite_CHATID"
  data TEXT -- JSON payload representing channels array or invite metadata
);

CREATE TABLE IF NOT EXISTS scheduled_deletions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER,
  message_ids TEXT, -- JSON string array
  delete_at INTEGER, -- Unix timestamp (milliseconds)
  link_param TEXT
);

CREATE TABLE IF NOT EXISTS broadcast_tasks (
  id TEXT PRIMARY KEY, -- randomly generated UUID/string
  admin_chat_id INTEGER,
  source_chat_id INTEGER,
  source_message_id INTEGER,
  status_message_id INTEGER,
  status TEXT DEFAULT 'pending',
  total INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  unsuccessful INTEGER DEFAULT 0,
  last_user_id INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS pending_actions (
  id INTEGER PRIMARY KEY, -- user_id
  action TEXT,
  data TEXT, -- JSON payload
  expires_at INTEGER -- Unix timestamp (milliseconds)
);
