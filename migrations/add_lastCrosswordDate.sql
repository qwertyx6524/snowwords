-- Add lastCrosswordDate column to users table
-- This tracks when free users last played a crossword (for daily limit)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS "lastCrosswordDate" TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_last_crossword_date
ON users("lastCrosswordDate");

-- Add comment
COMMENT ON COLUMN users."lastCrosswordDate" IS 'Timestamp of when user last generated a crossword puzzle (for daily limit enforcement)';
