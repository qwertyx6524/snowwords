# Database Migrations

## How to Run Migrations

### On Supabase:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file you want to run
4. Paste it into the SQL Editor
5. Click "Run" or press Cmd/Ctrl + Enter

## Migration: Add lastCrosswordDate Column

**File:** `add_lastCrosswordDate.sql`

**Purpose:** Adds a `lastCrosswordDate` column to the `users` table to track when free users last played a crossword puzzle, enabling the 1-per-day limit.

**Required:** Yes - Must be run before the crossword daily limit feature will work.

**Safe to re-run:** Yes - Uses `IF NOT EXISTS` clauses.

To apply this migration, run the SQL in `add_lastCrosswordDate.sql` in your Supabase SQL Editor.
