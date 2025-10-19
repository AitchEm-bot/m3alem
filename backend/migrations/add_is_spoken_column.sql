-- Migration: Add is_spoken column to messages table
-- This column tracks whether a message was spoken during a voice call
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/pjxirlqyjapyaovshmgb/sql

-- Add is_spoken column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_spoken BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on is_spoken messages
CREATE INDEX IF NOT EXISTS idx_messages_is_spoken
ON messages(is_spoken)
WHERE is_spoken = TRUE;

-- Update existing messages to have is_spoken = false (default)
-- This is optional since we have DEFAULT FALSE, but makes it explicit
UPDATE messages
SET is_spoken = FALSE
WHERE is_spoken IS NULL;
