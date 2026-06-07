-- Chat additions: username, friends, voice rooms

-- Add username to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

-- Friends
CREATE TABLE IF NOT EXISTS friendships (
  id BIGSERIAL PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);

-- Voice rooms
CREATE TABLE IF NOT EXISTS voice_rooms (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  is_temporary BOOLEAN DEFAULT false,
  stage_mode BOOLEAN DEFAULT false,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at BIGINT,
  quick_code VARCHAR(16) UNIQUE,
  max_participants INT DEFAULT 20,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES voice_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'listener',     -- 'host', 'speaker', 'listener'
  is_muted BOOLEAN DEFAULT false,
  screen_sharing BOOLEAN DEFAULT false,
  joined_at BIGINT NOT NULL,
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_members_room ON voice_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_voice_rooms_code ON voice_rooms(quick_code) WHERE quick_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_rooms_public ON voice_rooms(is_public, created_at DESC);
