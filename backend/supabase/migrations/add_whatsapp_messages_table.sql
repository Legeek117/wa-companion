-- ============================================
-- Add whatsapp_messages table to store all messages
-- ============================================

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  from_me BOOLEAN NOT NULL DEFAULT FALSE,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(50) CHECK (media_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_contact ON whatsapp_messages(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin will bypass RLS via Service Role, but let's add basic policies)
CREATE POLICY "Users can view own messages"
  ON whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
