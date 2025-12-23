-- Add status column to issuers_new table
-- Status values: 'active' (default), 'pending', 'suspended'

-- Add the status column if it doesn't exist
ALTER TABLE issuers_new
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add constraint to ensure valid status values
-- First drop existing constraint if any
ALTER TABLE issuers_new
DROP CONSTRAINT IF EXISTS issuers_new_status_check;

-- Add the check constraint
ALTER TABLE issuers_new
ADD CONSTRAINT issuers_new_status_check
CHECK (status IN ('active', 'pending', 'suspended'));

-- Update any NULL values to 'active'
UPDATE issuers_new SET status = 'active' WHERE status IS NULL;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_issuers_new_status ON issuers_new(status);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'issuers_new' AND column_name = 'status';
