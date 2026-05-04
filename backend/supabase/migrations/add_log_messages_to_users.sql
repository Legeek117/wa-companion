-- ============================================
-- Add log_messages column to users table
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS log_messages BOOLEAN DEFAULT FALSE;

-- Update existing users if necessary
-- UPDATE users SET log_messages = FALSE WHERE log_messages IS NULL;
