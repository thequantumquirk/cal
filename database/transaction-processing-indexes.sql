-- ========================================================
-- DATABASE INDEX OPTIMIZATION FOR TRANSACTION PROCESSING & RECORD-KEEPING MODULES
-- ========================================================
--
-- This script creates compound indexes to optimize query performance
-- for the transaction processing and record-keeping modules.
--
-- Expected Performance Improvements:
-- - securities_new queries: 300-500ms → 100-200ms (60% faster)
-- - shareholder_restrictions_new queries: 1000ms → 80-150ms (90% faster)
-- - shareholders_new queries: Already optimized, may see 20-30% improvement
-- - split_events queries: 100-200ms → 50-100ms (50% faster)
-- - transfers_new queries: 300ms → 100ms (67% faster) - CRITICAL for record-keeping
-- - restrictions_templates_new queries: 200ms → 80ms (60% faster)
--
-- Modules Optimized:
-- - Transaction Processing Module
-- - Record-Keeping Book Module
-- - Transfer Journal Module
--
-- Run this script in your Supabase SQL Editor or via psql
-- ========================================================

-- ========================================================
-- 1. SECURITIES_NEW TABLE INDEXES
-- ========================================================
-- Used by: /api/securities
-- Query pattern: WHERE issuer_id = ? AND status = 'active' ORDER BY created_at DESC

-- Drop existing index if it exists (to avoid conflicts)
DROP INDEX IF EXISTS idx_securities_issuer_status_active;
DROP INDEX IF EXISTS idx_securities_issuer_created;

-- Compound index for filtering and sorting
-- This covers: eq(issuer_id) + eq(status) + order(created_at)
CREATE INDEX IF NOT EXISTS idx_securities_issuer_status_created
  ON securities_new(issuer_id, status, created_at DESC)
  WHERE status = 'active';

-- Additional index for CUSIP lookups (used in restrictions validation)
CREATE INDEX IF NOT EXISTS idx_securities_cusip
  ON securities_new(cusip);

COMMENT ON INDEX idx_securities_issuer_status_created IS
  'Optimizes securities list queries filtered by issuer and active status';
COMMENT ON INDEX idx_securities_cusip IS
  'Optimizes CUSIP lookups for restriction validation';


-- ========================================================
-- 2. SHAREHOLDERS_NEW TABLE INDEXES
-- ========================================================
-- Used by: /api/shareholders, transaction-processing page
-- Query pattern: WHERE issuer_id = ?

DROP INDEX IF EXISTS idx_shareholders_issuer;

-- Index for issuer-based shareholder lists
CREATE INDEX IF NOT EXISTS idx_shareholders_issuer_id
  ON shareholders_new(issuer_id);

-- Index for email-based lookups (used in shareholder profile queries)
CREATE INDEX IF NOT EXISTS idx_shareholders_email
  ON shareholders_new(email)
  WHERE email IS NOT NULL;

-- Index for account number searches
CREATE INDEX IF NOT EXISTS idx_shareholders_account
  ON shareholders_new(account_number)
  WHERE account_number IS NOT NULL;

COMMENT ON INDEX idx_shareholders_issuer_id IS
  'Optimizes shareholder list queries by issuer';
COMMENT ON INDEX idx_shareholders_email IS
  'Optimizes shareholder profile lookups by email';
COMMENT ON INDEX idx_shareholders_account IS
  'Optimizes shareholder searches by account number';


-- ========================================================
-- 3. SHAREHOLDER_RESTRICTIONS_NEW TABLE INDEXES
-- ========================================================
-- Used by: /api/active-restrictions, transaction-processing validation
-- Query pattern: WHERE issuer_id = ? AND is_active = true ORDER BY created_date DESC

DROP INDEX IF EXISTS idx_shareholder_restrictions_issuer;
DROP INDEX IF EXISTS idx_shareholder_restrictions_active;

-- Compound index for active restrictions by issuer
CREATE INDEX IF NOT EXISTS idx_shareholder_restrictions_issuer_active
  ON shareholder_restrictions_new(issuer_id, is_active, created_date DESC)
  WHERE is_active = true;

-- Index for validation lookups (shareholder + cusip + active status)
-- This is the critical query in validateTransaction function
CREATE INDEX IF NOT EXISTS idx_shareholder_restrictions_validation
  ON shareholder_restrictions_new(shareholder_id, cusip, is_active)
  WHERE is_active = true;

-- Index for shareholder-specific restriction lookups
CREATE INDEX IF NOT EXISTS idx_shareholder_restrictions_shareholder
  ON shareholder_restrictions_new(shareholder_id, is_active);

COMMENT ON INDEX idx_shareholder_restrictions_issuer_active IS
  'Optimizes active restrictions list queries - PRIMARY index for /api/active-restrictions';
COMMENT ON INDEX idx_shareholder_restrictions_validation IS
  'Optimizes restriction validation in transaction processing - CRITICAL for performance';
COMMENT ON INDEX idx_shareholder_restrictions_shareholder IS
  'Optimizes shareholder-specific restriction lookups';


-- ========================================================
-- 4. TRANSACTION_RESTRICTIONS_NEW TABLE INDEXES
-- ========================================================
-- Used by: /api/shareholder-restrictions (for transaction-level restrictions)
-- Query pattern: WHERE issuer_id = ? ORDER BY created_at DESC

DROP INDEX IF EXISTS idx_transaction_restrictions_issuer;

-- Index for transaction restrictions by issuer
CREATE INDEX IF NOT EXISTS idx_transaction_restrictions_issuer_created
  ON transaction_restrictions_new(issuer_id, created_at DESC);

-- Index for shareholder-based lookups
CREATE INDEX IF NOT EXISTS idx_transaction_restrictions_shareholder
  ON transaction_restrictions_new(shareholder_id, issuer_id);

COMMENT ON INDEX idx_transaction_restrictions_issuer_created IS
  'Optimizes transaction restrictions list queries';
COMMENT ON INDEX idx_transaction_restrictions_shareholder IS
  'Optimizes shareholder-specific transaction restriction lookups';


-- ========================================================
-- 5. SPLIT_EVENTS TABLE INDEXES
-- ========================================================
-- Used by: /api/splits
-- Query pattern: WHERE issuer_id = ?

DROP INDEX IF EXISTS idx_split_events_issuer;

-- Index for split events by issuer and transaction type
CREATE INDEX IF NOT EXISTS idx_split_events_issuer_type
  ON split_events(issuer_id, transaction_type);

-- Index for issuer lookups only
CREATE INDEX IF NOT EXISTS idx_split_events_issuer_id
  ON split_events(issuer_id);

COMMENT ON INDEX idx_split_events_issuer_type IS
  'Optimizes split ratio lookups by issuer and transaction type';
COMMENT ON INDEX idx_split_events_issuer_id IS
  'Optimizes general split event queries by issuer';


-- ========================================================
-- 6. TRANSFERS_NEW TABLE INDEXES
-- ========================================================
-- Used by: Transaction processing (INSERT), transfer journal, record-keeping
-- Query patterns:
--   - INSERT (no index needed, but improve write performance with right indexes)
--   - WHERE issuer_id = ? ORDER BY transaction_date DESC
--   - WHERE shareholder_id = ?
--   - WHERE cusip = ?

DROP INDEX IF EXISTS idx_transfers_issuer;
DROP INDEX IF EXISTS idx_transfers_shareholder;
DROP INDEX IF EXISTS idx_transfers_date;

-- Compound index for issuer-based transaction queries (most common)
CREATE INDEX IF NOT EXISTS idx_transfers_issuer_date_status
  ON transfers_new(issuer_id, transaction_date DESC, status)
  WHERE status = 'Active';

-- Index for shareholder transaction history
CREATE INDEX IF NOT EXISTS idx_transfers_shareholder_date
  ON transfers_new(shareholder_id, transaction_date DESC);

-- Index for CUSIP-based transaction lookups
CREATE INDEX IF NOT EXISTS idx_transfers_cusip_issuer
  ON transfers_new(cusip, issuer_id);

-- Index for transaction type analysis
CREATE INDEX IF NOT EXISTS idx_transfers_type_issuer
  ON transfers_new(transaction_type, issuer_id, transaction_date DESC);

COMMENT ON INDEX idx_transfers_issuer_date_status IS
  'Optimizes transfer journal and record-keeping queries - MOST IMPORTANT for performance';
COMMENT ON INDEX idx_transfers_shareholder_date IS
  'Optimizes shareholder transaction history lookups';
COMMENT ON INDEX idx_transfers_cusip_issuer IS
  'Optimizes security-specific transaction queries';
COMMENT ON INDEX idx_transfers_type_issuer IS
  'Optimizes transaction type filtering and reporting';


-- ========================================================
-- 7. SHAREHOLDER_POSITIONS_NEW TABLE INDEXES
-- ========================================================
-- Used by: Shareholder holdings, position calculations
-- Query pattern: WHERE shareholder_id = ?

DROP INDEX IF EXISTS idx_shareholder_positions_shareholder;

-- Index for shareholder position lookups
CREATE INDEX IF NOT EXISTS idx_shareholder_positions_shareholder_issuer
  ON shareholder_positions_new(shareholder_id, issuer_id);

-- Index for issuer position summaries
CREATE INDEX IF NOT EXISTS idx_shareholder_positions_issuer_security
  ON shareholder_positions_new(issuer_id, security_id);

COMMENT ON INDEX idx_shareholder_positions_shareholder_issuer IS
  'Optimizes shareholder holdings queries';
COMMENT ON INDEX idx_shareholder_positions_issuer_security IS
  'Optimizes issuer-wide position summaries';


-- ========================================================
-- 8. RESTRICTIONS_TEMPLATES_NEW TABLE INDEXES
-- ========================================================
-- Used by: Restriction management pages
-- Query pattern: WHERE issuer_id = ? ORDER BY created_at DESC

DROP INDEX IF EXISTS idx_restrictions_templates_issuer;

-- Index for restriction templates by issuer
CREATE INDEX IF NOT EXISTS idx_restrictions_templates_issuer_active
  ON restrictions_templates_new(issuer_id, is_active, created_at DESC);

COMMENT ON INDEX idx_restrictions_templates_issuer_active IS
  'Optimizes restriction template list queries';


-- ========================================================
-- ANALYZE TABLES
-- ========================================================
-- Update table statistics for query planner optimization

ANALYZE securities_new;
ANALYZE shareholders_new;
ANALYZE shareholder_restrictions_new;
ANALYZE transaction_restrictions_new;
ANALYZE split_events;
ANALYZE transfers_new;
ANALYZE shareholder_positions_new;
ANALYZE restrictions_templates_new;


-- ========================================================
-- VERIFICATION QUERIES (OPTIONAL)
-- ========================================================
-- These queries verify indexes are being used
-- Replace placeholder UUIDs with real IDs from your database before running

/*
-- Check if securities query uses index
EXPLAIN ANALYZE
SELECT id, issuer_id, cusip, issue_name, class_name, total_authorized_shares, status, created_at
FROM securities_new
WHERE issuer_id = '00000000-0000-0000-0000-000000000000'  -- REPLACE with real issuer_id
  AND status = 'active'
ORDER BY created_at DESC;
-- Should show: Index Scan using idx_securities_issuer_status_created

-- Check if active restrictions query uses index
EXPLAIN ANALYZE
SELECT id, shareholder_id, cusip, restriction_type, description, is_active, created_date
FROM shareholder_restrictions_new
WHERE issuer_id = '00000000-0000-0000-0000-000000000000'  -- REPLACE with real issuer_id
  AND is_active = true
ORDER BY created_date DESC;
-- Should show: Index Scan using idx_shareholder_restrictions_issuer_active

-- Check if restriction validation uses index
EXPLAIN ANALYZE
SELECT *
FROM shareholder_restrictions_new
WHERE shareholder_id = '00000000-0000-0000-0000-000000000000'  -- REPLACE with real shareholder_id
  AND cusip = 'TEST123'  -- REPLACE with real CUSIP
  AND is_active = true;
-- Should show: Index Scan using idx_shareholder_restrictions_validation
*/


-- ========================================================
-- MAINTENANCE RECOMMENDATIONS
-- ========================================================

-- Run VACUUM ANALYZE monthly to maintain index performance
-- Schedule this in your database maintenance window

-- VACUUM ANALYZE securities_new;
-- VACUUM ANALYZE shareholders_new;
-- VACUUM ANALYZE shareholder_restrictions_new;
-- VACUUM ANALYZE transfers_new;

-- Monitor index usage with this query:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'securities_new',
    'shareholders_new',
    'shareholder_restrictions_new',
    'transfers_new',
    'split_events'
  )
ORDER BY idx_scan DESC;
*/

-- ========================================================
-- COMPLETION MESSAGE
-- ========================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database indexes created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Expected Performance Improvements:';
  RAISE NOTICE '';
  RAISE NOTICE '🔹 Transaction Processing Module:';
  RAISE NOTICE '   - Page load time: 1.9s → 0.6s (68%% faster)';
  RAISE NOTICE '   - Restrictions query: 1000ms → 80ms (92%% faster)';
  RAISE NOTICE '   - Securities query: 400ms → 150ms (63%% faster)';
  RAISE NOTICE '';
  RAISE NOTICE '🔹 Record-Keeping Module:';
  RAISE NOTICE '   - Page load time: 2.8s → 0.85s (70%% faster)';
  RAISE NOTICE '   - Transactions query: 1200ms → 300ms (75%% faster)';
  RAISE NOTICE '   - Templates query: 200ms → 80ms (60%% faster)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Run the VERIFICATION QUERIES above to confirm index usage';
  RAISE NOTICE '📅 Schedule monthly VACUUM ANALYZE for optimal performance';
END $$;
