-- =====================================================
-- SHAREHOLDER DUPLICATE CLEANUP SCRIPT
-- =====================================================
-- This script identifies and removes duplicate shareholders
-- A duplicate is defined as: same issuer_id + first_name + last_name + account_number
-- 
-- STEP 1: Review duplicates
-- STEP 2: Delete duplicates (keeps the oldest record)
-- =====================================================

-- =====================================================
-- STEP 1: IDENTIFY DUPLICATES (Run this first to review)
-- =====================================================

-- Count of duplicates by issuer
SELECT 
    i.display_name as issuer,
    COUNT(*) as duplicate_groups,
    SUM(dup.cnt - 1) as records_to_delete
FROM (
    SELECT 
        issuer_id,
        first_name,
        last_name,
        account_number,
        COUNT(*) as cnt
    FROM shareholders_new
    GROUP BY issuer_id, first_name, last_name, account_number
    HAVING COUNT(*) > 1
) dup
JOIN issuers_new i ON i.id = dup.issuer_id
GROUP BY i.display_name
ORDER BY records_to_delete DESC;

-- =====================================================
-- DETAILED VIEW: Show all duplicate records
-- =====================================================

SELECT 
    s.id,
    i.display_name as issuer,
    s.first_name,
    s.last_name,
    s.account_number,
    s.email,
    s.user_id,
    s.created_at,
    'DUPLICATE' as status
FROM shareholders_new s
JOIN issuers_new i ON i.id = s.issuer_id
WHERE (s.issuer_id, s.first_name, s.last_name, s.account_number) IN (
    SELECT issuer_id, first_name, last_name, account_number
    FROM shareholders_new
    GROUP BY issuer_id, first_name, last_name, account_number
    HAVING COUNT(*) > 1
)
ORDER BY s.issuer_id, s.first_name, s.last_name, s.created_at;

-- =====================================================
-- STEP 2: DELETE DUPLICATES (RUN AFTER REVIEWING ABOVE)
-- Keeps the OLDEST record (smallest created_at) for each group
-- =====================================================

-- DRY RUN: Show what would be deleted
SELECT 
    s.id,
    i.display_name as issuer,
    s.first_name,
    s.last_name,
    s.account_number,
    s.email,
    s.created_at,
    'WILL BE DELETED' as action
FROM shareholders_new s
JOIN issuers_new i ON i.id = s.issuer_id
WHERE s.id NOT IN (
    -- Keep the oldest (first created) record for each duplicate group
    SELECT DISTINCT ON (issuer_id, first_name, last_name, account_number) id
    FROM shareholders_new
    ORDER BY issuer_id, first_name, last_name, account_number, created_at ASC
)
AND (s.issuer_id, s.first_name, s.last_name, s.account_number) IN (
    SELECT issuer_id, first_name, last_name, account_number
    FROM shareholders_new
    GROUP BY issuer_id, first_name, last_name, account_number
    HAVING COUNT(*) > 1
)
ORDER BY s.issuer_id, s.first_name, s.last_name;

-- =====================================================
-- ACTUAL DELETE (UNCOMMENT TO EXECUTE)
-- =====================================================

/*
DELETE FROM shareholders_new
WHERE id NOT IN (
    -- Keep the oldest (first created) record for each duplicate group
    SELECT DISTINCT ON (issuer_id, first_name, last_name, account_number) id
    FROM shareholders_new
    ORDER BY issuer_id, first_name, last_name, account_number, created_at ASC
)
AND (issuer_id, first_name, last_name, account_number) IN (
    SELECT issuer_id, first_name, last_name, account_number
    FROM shareholders_new
    GROUP BY issuer_id, first_name, last_name, account_number
    HAVING COUNT(*) > 1
);
*/

-- =====================================================
-- ALTERNATIVE: Delete duplicates, keeping record with user_id linked
-- (Prioritizes linked records over unlinked ones)
-- =====================================================

/*
DELETE FROM shareholders_new s
WHERE s.id NOT IN (
    SELECT DISTINCT ON (issuer_id, first_name, last_name, account_number) id
    FROM shareholders_new
    ORDER BY 
        issuer_id, 
        first_name, 
        last_name, 
        account_number, 
        -- Priority: records with user_id first, then by created_at
        (CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END),
        created_at ASC
)
AND (s.issuer_id, s.first_name, s.last_name, s.account_number) IN (
    SELECT issuer_id, first_name, last_name, account_number
    FROM shareholders_new
    GROUP BY issuer_id, first_name, last_name, account_number
    HAVING COUNT(*) > 1
);
*/

-- =====================================================
-- VERIFY: Check remaining count after cleanup
-- =====================================================

SELECT 
    'Before cleanup' as status,
    COUNT(*) as total_shareholders,
    (SELECT COUNT(*) FROM (
        SELECT issuer_id, first_name, last_name, account_number
        FROM shareholders_new
        GROUP BY issuer_id, first_name, last_name, account_number
        HAVING COUNT(*) > 1
    ) dups) as duplicate_groups
FROM shareholders_new;

-- =====================================================
-- OPTIONAL: Add unique constraint to prevent future duplicates
-- =====================================================

/*
-- First, ensure cleanup is complete, then:
CREATE UNIQUE INDEX idx_shareholders_unique 
ON shareholders_new (issuer_id, first_name, last_name, account_number)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL AND account_number IS NOT NULL;
*/
