-- ============================================
-- AMDA Complete Database Schema - Supabase PostgreSQL
-- This file contains all tables, indexes, functions, triggers, and RLS policies
-- needed to initialize the AMDA database for production.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- ============================================
-- 2. SUBSCRIPTIONS TABLE (Stripe)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'premium')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- 3. WHATSAPP SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  qr_code TEXT,
  pairing_code VARCHAR(20),
  status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected')),
  connected_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);

-- ============================================
-- 4. VIEW ONCE CAPTURES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS view_once_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('image', 'video')),
  file_size BIGINT,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_view_once_captures_user_id ON view_once_captures(user_id);
CREATE INDEX IF NOT EXISTS idx_view_once_captures_captured_at ON view_once_captures(captured_at);

-- ============================================
-- 5. DELETED MESSAGES TABLE (LOGS ONLY)
-- ============================================
CREATE TABLE IF NOT EXISTS deleted_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(50) CHECK (media_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  delay_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_messages_user_id ON deleted_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_messages_deleted_at ON deleted_messages(deleted_at);

-- ============================================
-- 6. VIEW ONCE COMMAND CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS view_once_command_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  command_text VARCHAR(50) DEFAULT '.vv',
  command_emoji VARCHAR(10),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_view_once_command_config_user_id ON view_once_command_config(user_id);

-- ============================================
-- 7. QUOTAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  view_once_count INTEGER DEFAULT 0,
  deleted_messages_count INTEGER DEFAULT 0,
  scheduled_statuses_count INTEGER DEFAULT 0,
  reset_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_quotas_user_id ON quotas(user_id);

-- ============================================
-- 8. FCM TOKENS TABLE (Push Notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- ============================================
-- 9. NOTIFICATION SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  view_once BOOLEAN DEFAULT TRUE,
  status_liked BOOLEAN DEFAULT TRUE,
  deleted_message BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize quota for new user
CREATE OR REPLACE FUNCTION initialize_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO quotas (user_id, reset_date)
  VALUES (NEW.id, DATE_TRUNC('month', NOW())::DATE + INTERVAL '1 month')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create quota when user is created
DROP TRIGGER IF EXISTS create_user_quota ON users;
CREATE TRIGGER create_user_quota AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION initialize_user_quota();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_once_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_once_command_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Basic Policies (User can only see their own data)
CREATE POLICY "Users can manage own profile" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON whatsapp_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own captures" ON view_once_captures FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own deleted messages" ON deleted_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own view once config" ON view_once_command_config FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quotas" ON quotas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own FCM tokens" ON fcm_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notification settings" ON notification_settings FOR ALL USING (auth.uid() = user_id);
