-- Migration: Add pairing_code column to whatsapp_sessions table
-- Date: 2025-11-09

-- Add pairing_code column if it doesn't exist
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS pairing_code VARCHAR(20);

-- Add comment to document the column
COMMENT ON COLUMN whatsapp_sessions.pairing_code IS 'WhatsApp pairing code for device linking (alternative to QR code)';








