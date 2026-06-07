-- KRL Chat Schema

CREATE TABLE IF NOT EXISTS chat_rooms (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'direct',   -- 'direct','group','channel'
  name VARCHAR(255),
  description TEXT,
  avatar TEXT,
  invite_code VARCHAR(32) UNIQUE,
  is_public BOOLEAN DEFAULT false,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',            -- 'owner','admin','member'
  last_read_at BIGINT DEFAULT 0,
  joined_at BIGINT NOT NULL,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  type VARCHAR(20) DEFAULT 'text',              -- 'text','file','voice','system'
  thread_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
  reply_count INT DEFAULT 0,
  edited_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
  name VARCHAR(500),
  mime_type VARCHAR(255),
  size BIGINT,
  url TEXT,
  drive_file_id BIGINT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_room ON chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_invite ON chat_rooms(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_public ON chat_rooms(is_public) WHERE is_public = true;
