-- ============================================
-- VIEW ONCE COMMAND CONFIG TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_view_once_command_config_user_id ON view_once_command_config(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_view_once_command_config_updated_at ON view_once_command_config;
CREATE TRIGGER update_view_once_command_config_updated_at 
  BEFORE UPDATE ON view_once_command_config
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE view_once_command_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own view once command" ON view_once_command_config;
CREATE POLICY "Users can manage own view once command"
  ON view_once_command_config FOR ALL
  USING (auth.uid() = user_id);

