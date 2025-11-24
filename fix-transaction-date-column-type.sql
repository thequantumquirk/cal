-- Fix transaction_date column type from TEXT to DATE
-- This fixes the timezone issue where dates are displayed one day earlier

-- IMPORTANT: Run this migration in your Supabase SQL editor

BEGIN;

-- 1. Fix transfers_new table (if it exists and has transaction_date as TEXT)
DO $$
BEGIN
    -- Check if transfers_new table exists and transaction_date is TEXT
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transfers_new'
        AND column_name = 'transaction_date'
        AND data_type = 'text'
    ) THEN
        -- Convert existing TEXT dates to DATE type
        -- This handles both MM/DD/YYYY and YYYY-MM-DD formats
        ALTER TABLE transfers_new
        ALTER COLUMN transaction_date TYPE DATE
        USING CASE
            -- Handle MM/DD/YYYY format
            WHEN transaction_date ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
                TO_DATE(transaction_date, 'MM/DD/YYYY')
            -- Handle YYYY-MM-DD format
            WHEN transaction_date ~ '^\d{4}-\d{2}-\d{2}$' THEN
                TO_DATE(transaction_date, 'YYYY-MM-DD')
            -- Handle ISO timestamp format (extract date part)
            WHEN transaction_date ~ '^\d{4}-\d{2}-\d{2}T' THEN
                TO_DATE(SPLIT_PART(transaction_date, 'T', 1), 'YYYY-MM-DD')
            ELSE NULL
        END;

        RAISE NOTICE 'Successfully converted transfers_new.transaction_date from TEXT to DATE';
    ELSE
        RAISE NOTICE 'transfers_new.transaction_date is already DATE type or table does not exist';
    END IF;
END $$;

-- 2. Fix recordkeeping_transactions_prototype table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'recordkeeping_transactions_prototype'
        AND column_name = 'transaction_date'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE recordkeeping_transactions_prototype
        ALTER COLUMN transaction_date TYPE DATE
        USING CASE
            WHEN transaction_date ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
                TO_DATE(transaction_date, 'MM/DD/YYYY')
            WHEN transaction_date ~ '^\d{4}-\d{2}-\d{2}$' THEN
                TO_DATE(transaction_date, 'YYYY-MM-DD')
            WHEN transaction_date ~ '^\d{4}-\d{2}-\d{2}T' THEN
                TO_DATE(SPLIT_PART(transaction_date, 'T', 1), 'YYYY-MM-DD')
            ELSE NULL
        END;

        RAISE NOTICE 'Successfully converted recordkeeping_transactions_prototype.transaction_date from TEXT to DATE';
    ELSE
        RAISE NOTICE 'recordkeeping_transactions_prototype.transaction_date is already DATE type or table does not exist';
    END IF;
END $$;

-- 3. Verify the changes
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'transaction_date'
AND table_name IN ('transfers_new', 'recordkeeping_transactions_prototype')
ORDER BY table_name;

COMMIT;

-- After running this migration, dates will be stored correctly as DATE type
-- and will not suffer from timezone conversion issues
