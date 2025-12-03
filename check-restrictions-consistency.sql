-- ============================================================================
-- RESTRICTION TEMPLATES CONSISTENCY CHECK SCRIPT
-- Run this in BOTH dev and prod, then compare the outputs
-- ============================================================================

\echo '================================================'
\echo 'RESTRICTION TEMPLATES CONSISTENCY CHECK'
\echo '================================================'
\echo ''

-- ============================================================================
-- 1. CHECK TABLE EXISTENCE
-- ============================================================================
\echo '1. TABLE EXISTENCE CHECK'
\echo '------------------------'

SELECT
    tablename as "Table Name",
    schemaname as "Schema",
    CASE
        WHEN tablename IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as "Status"
FROM pg_tables
WHERE tablename IN (
    'restrictions_templates_new',
    'issuer_users_new',
    'roles_new',
    'users_new',
    'issuers_new',
    'transaction_restrictions_new',
    'shareholder_restrictions_new'
)
AND schemaname = 'public'
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 2. CHECK RESTRICTIONS_TEMPLATES_NEW TABLE STRUCTURE
-- ============================================================================
\echo '2. RESTRICTIONS_TEMPLATES_NEW TABLE STRUCTURE'
\echo '---------------------------------------------'

SELECT
    column_name as "Column Name",
    data_type as "Data Type",
    character_maximum_length as "Max Length",
    is_nullable as "Nullable",
    column_default as "Default Value"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'restrictions_templates_new'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 3. CHECK REQUIRED COLUMNS SPECIFICALLY
-- ============================================================================
\echo '3. CRITICAL COLUMNS CHECK'
\echo '-------------------------'

WITH required_columns AS (
    SELECT unnest(ARRAY[
        'id',
        'issuer_id',
        'restriction_type',
        'restriction_name',
        'description',
        'is_active',
        'created_by',
        'created_at',
        'updated_at'
    ]) AS column_name
),
existing_columns AS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'restrictions_templates_new'
)
SELECT
    rc.column_name as "Required Column",
    CASE
        WHEN ec.column_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as "Status"
FROM required_columns rc
LEFT JOIN existing_columns ec ON rc.column_name = ec.column_name
ORDER BY rc.column_name;

\echo ''

-- ============================================================================
-- 4. CHECK INDEXES
-- ============================================================================
\echo '4. INDEX CHECK'
\echo '--------------'

SELECT
    schemaname as "Schema",
    tablename as "Table",
    indexname as "Index Name",
    indexdef as "Index Definition"
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'restrictions_templates_new'
ORDER BY indexname;

\echo ''

-- ============================================================================
-- 5. CHECK PRIMARY KEY AND UNIQUE CONSTRAINTS
-- ============================================================================
\echo '5. PRIMARY KEY AND CONSTRAINTS'
\echo '------------------------------'

SELECT
    tc.constraint_name as "Constraint Name",
    tc.constraint_type as "Type",
    kcu.column_name as "Column",
    tc.is_deferrable as "Deferrable",
    tc.initially_deferred as "Initially Deferred"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'restrictions_templates_new'
ORDER BY tc.constraint_type, tc.constraint_name;

\echo ''

-- ============================================================================
-- 6. CHECK FOREIGN KEY RELATIONSHIPS
-- ============================================================================
\echo '6. FOREIGN KEY RELATIONSHIPS'
\echo '----------------------------'

SELECT
    tc.constraint_name as "FK Constraint",
    kcu.column_name as "Column",
    ccu.table_name AS "References Table",
    ccu.column_name AS "References Column",
    rc.update_rule as "On Update",
    rc.delete_rule as "On Delete"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'restrictions_templates_new'
ORDER BY tc.constraint_name;

\echo ''

-- ============================================================================
-- 7. CHECK ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
\echo '7. ROW LEVEL SECURITY POLICIES'
\echo '------------------------------'

SELECT
    schemaname as "Schema",
    tablename as "Table",
    policyname as "Policy Name",
    permissive as "Permissive",
    roles as "Roles",
    cmd as "Command",
    qual as "USING Expression",
    with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'restrictions_templates_new'
ORDER BY policyname;

\echo ''

-- ============================================================================
-- 8. CHECK RLS ENABLED STATUS
-- ============================================================================
\echo '8. RLS ENABLED STATUS'
\echo '---------------------'

SELECT
    schemaname as "Schema",
    tablename as "Table",
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'restrictions_templates_new',
        'issuer_users_new',
        'roles_new'
    )
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 9. CHECK RELATED TABLES STRUCTURE (ISSUER_USERS_NEW)
-- ============================================================================
\echo '9. ISSUER_USERS_NEW TABLE STRUCTURE'
\echo '------------------------------------'

SELECT
    column_name as "Column Name",
    data_type as "Data Type",
    is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'issuer_users_new'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 10. CHECK RELATED TABLES STRUCTURE (ROLES_NEW)
-- ============================================================================
\echo '10. ROLES_NEW TABLE STRUCTURE'
\echo '-----------------------------'

SELECT
    column_name as "Column Name",
    data_type as "Data Type",
    is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'roles_new'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 11. CHECK USERS_NEW TABLE FOR SUPER ADMIN FIELD
-- ============================================================================
\echo '11. USERS_NEW SUPER ADMIN FIELD CHECK'
\echo '--------------------------------------'

SELECT
    column_name as "Column Name",
    data_type as "Data Type",
    is_nullable as "Nullable",
    column_default as "Default"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users_new'
    AND column_name IN ('id', 'email', 'is_super_admin')
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 12. SAMPLE DATA COUNT
-- ============================================================================
\echo '12. DATA COUNT CHECK'
\echo '--------------------'

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'restrictions_templates_new'
    ) THEN
        EXECUTE 'SELECT
            COUNT(*) as "Total Templates",
            COUNT(CASE WHEN is_active = true THEN 1 END) as "Active Templates",
            COUNT(CASE WHEN is_active = false THEN 1 END) as "Inactive Templates",
            COUNT(DISTINCT issuer_id) as "Issuers with Templates"
        FROM restrictions_templates_new';
    ELSE
        RAISE NOTICE 'Table restrictions_templates_new does not exist';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- 13. CHECK FOR SPECIFIC INDEX (idx_restrictions_templates_issuer_active)
-- ============================================================================
\echo '13. CRITICAL INDEX CHECK'
\echo '------------------------'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname = 'idx_restrictions_templates_issuer_active'
        ) THEN '✓ idx_restrictions_templates_issuer_active EXISTS'
        ELSE '✗ idx_restrictions_templates_issuer_active MISSING'
    END as "Index Status";

\echo ''

-- ============================================================================
-- 14. PERMISSIONS CHECK
-- ============================================================================
\echo '14. TABLE PERMISSIONS'
\echo '---------------------'

SELECT
    grantee as "Role/User",
    privilege_type as "Privilege",
    is_grantable as "Grantable"
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name = 'restrictions_templates_new'
ORDER BY grantee, privilege_type;

\echo ''
\echo '================================================'
\echo 'CONSISTENCY CHECK COMPLETE'
\echo 'Save this output and compare with other environment'
\echo '================================================'
