-- ========================================
-- CRITICAL PERFORMANCE INDEXES
-- ========================================
-- Run this SQL in your Supabase SQL Editor to fix the 2+ second API response times
--
-- Tables optimized:
-- 1. securities_new
-- 2. shareholders_new
-- 3. transfers_new
-- 4. restrictions_templates_new
--
-- Expected improvement: 95%+ faster (2000ms → 50-100ms per query)
-- ========================================

-- ========================================
-- 1. SECURITIES_NEW INDEXES
-- ========================================

-- Primary query index: Filter by issuer_id AND status = 'active'
-- Query: .eq("issuer_id", issuerId).eq("status", "active").order("created_at", DESC)
-- This partial index only includes active securities, making it smaller and faster
CREATE INDEX IF NOT EXISTS idx_securities_issuer_status_active
ON securities_new(issuer_id, created_at DESC)
WHERE status = 'active';

-- Lookup index: Find securities by CUSIP (used in transaction enrichment)
-- Query: securitiesMap[transaction.cusip]
CREATE INDEX IF NOT EXISTS idx_securities_cusip
ON securities_new(cusip);

-- General issuer lookup (for queries without status filter)
CREATE INDEX IF NOT EXISTS idx_securities_issuer_id
ON securities_new(issuer_id);

-- ========================================
-- 2. SHAREHOLDERS_NEW INDEXES
-- ========================================

-- Primary query index: Filter by issuer_id
-- Query: .eq("issuer_id", issuerId)
CREATE INDEX IF NOT EXISTS idx_shareholders_issuer_id
ON shareholders_new(issuer_id);

-- Lookup index: Find shareholders by account_number (used in forms/lookups)
CREATE INDEX IF NOT EXISTS idx_shareholders_account_number
ON shareholders_new(account_number)
WHERE account_number IS NOT NULL;

-- Lookup index: Find shareholders by email (used in auth/profile lookups)
CREATE INDEX IF NOT EXISTS idx_shareholders_email
ON shareholders_new(email)
WHERE email IS NOT NULL;

-- ========================================
-- 3. TRANSFERS_NEW INDEXES (MOST CRITICAL)
-- ========================================

-- Primary query index: Filter by issuer_id and order by transaction_date
-- Query: .eq("issuer_id", issuerId).order("transaction_date", ASC)
-- This is a composite index that supports both filtering AND sorting
CREATE INDEX IF NOT EXISTS idx_transfers_issuer_date
ON transfers_new(issuer_id, transaction_date ASC);

-- Foreign key index: Find transfers by shareholder (for shareholder history)
-- Used in: shareholdersMap[transaction.shareholder_id]
CREATE INDEX IF NOT EXISTS idx_transfers_shareholder_id
ON transfers_new(shareholder_id)
WHERE shareholder_id IS NOT NULL;

-- Lookup index: Find transfers by CUSIP (for security transaction history)
CREATE INDEX IF NOT EXISTS idx_transfers_cusip
ON transfers_new(cusip)
WHERE cusip IS NOT NULL;

-- Status filter index: Filter by transaction status
CREATE INDEX IF NOT EXISTS idx_transfers_status
ON transfers_new(status)
WHERE status IS NOT NULL;

-- ========================================
-- 4. RESTRICTIONS_TEMPLATES_NEW INDEXES
-- ========================================

-- Primary query index: Filter by issuer_id and order by created_at DESC
-- Query: .eq("issuer_id", issuerId).order("created_at", DESC)
CREATE INDEX IF NOT EXISTS idx_restriction_templates_issuer_created
ON restrictions_templates_new(issuer_id, created_at DESC);

-- Active templates only (for frequently accessed data)
CREATE INDEX IF NOT EXISTS idx_restriction_templates_active
ON restrictions_templates_new(issuer_id, is_active)
WHERE is_active = true;

-- ========================================
-- VERIFY INDEXES WERE CREATED SUCCESSFULLY
-- ========================================

-- Run this query to see all newly created indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('securities_new', 'shareholders_new', 'transfers_new', 'restrictions_templates_new')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ========================================
-- CHECK INDEX SIZES (Optional - for monitoring)
-- ========================================

-- See how much space each index uses
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('securities_new', 'shareholders_new', 'transfers_new', 'restrictions_templates_new')
ORDER BY pg_relation_size(indexrelid) DESC;

-- ========================================
-- PERFORMANCE TESTING QUERIES
-- ========================================
-- Run these BEFORE and AFTER adding indexes to measure improvement
-- Replace 'YOUR-ISSUER-ID' with an actual issuer UUID

-- Test 1: Securities query (should go from ~2000ms to ~10-50ms)
EXPLAIN ANALYZE
SELECT id, issuer_id, cusip, issue_name, issue_ticker, class_name,
       trading_platform, total_authorized_shares, status, created_at
FROM securities_new
WHERE issuer_id = 'YOUR-ISSUER-ID'
  AND status = 'active'
ORDER BY created_at DESC;

-- Test 2: Shareholders query (should go from ~2000ms to ~10-50ms)
EXPLAIN ANALYZE
SELECT id, issuer_id, account_number, first_name, last_name, address,
       email, phone, holder_type, ownership_percentage, created_at, updated_at
FROM shareholders_new
WHERE issuer_id = 'YOUR-ISSUER-ID';

-- Test 3: Transfers query (should go from ~2000ms to ~10-50ms)
EXPLAIN ANALYZE
SELECT *
FROM transfers_new
WHERE issuer_id = 'YOUR-ISSUER-ID'
ORDER BY transaction_date ASC;

-- Test 4: Restriction templates query (should go from ~2000ms to ~10-50ms)
EXPLAIN ANALYZE
SELECT id, issuer_id, restriction_type, description, is_active, created_at, created_by
FROM restrictions_templates_new
WHERE issuer_id = 'YOUR-ISSUER-ID'
ORDER BY created_at DESC;

-- ========================================
-- EXPECTED EXPLAIN ANALYZE RESULTS
-- ========================================

-- BEFORE INDEXES (BAD):
-- Planning Time: 0.1 ms
-- Execution Time: 2000-5000 ms  ❌ SLOW - Full table scan
-- -> Seq Scan on [table_name]
--    Filter: (issuer_id = 'xxx')
--    Rows Removed by Filter: 50000+

-- AFTER INDEXES (GOOD):
-- Planning Time: 0.5 ms
-- Execution Time: 5-50 ms  ✅ FAST - Index scan
-- -> Index Scan using idx_[table]_issuer_[column]
--    Index Cond: (issuer_id = 'xxx')
--    Rows: 10-100

-- ========================================
-- MAINTENANCE NOTES
-- ========================================

-- PostgreSQL automatically maintains indexes, but you can rebuild them if needed:

-- Rebuild all indexes for a table (run during low-traffic periods):
-- REINDEX TABLE securities_new;
-- REINDEX TABLE shareholders_new;
-- REINDEX TABLE transfers_new;
-- REINDEX TABLE restrictions_templates_new;

-- Check for bloated indexes (run monthly):
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ========================================
-- INDEX STRATEGY SUMMARY
-- ========================================

-- 1. COMPOSITE INDEXES: (issuer_id, created_at) or (issuer_id, transaction_date)
--    - Supports both filtering AND sorting in one index
--    - Faster than separate indexes

-- 2. PARTIAL INDEXES: WHERE status = 'active' or WHERE is_active = true
--    - Smaller index size (only indexes active records)
--    - Faster queries for filtered data

-- 3. FOREIGN KEY INDEXES: shareholder_id, cusip
--    - Speed up JOINs and lookups
--    - Critical for data enrichment on client side

-- 4. COVERING INDEXES: Include frequently accessed columns
--    - Already covered by selecting only needed columns in queries

-- ========================================
-- CACHE INVALIDATION (when data changes)
-- ========================================

-- After INSERT/UPDATE/DELETE operations, you may want to clear Next.js cache:
-- This is typically done automatically by Next.js revalidation (300 seconds)
-- Manual cache clearing can be done via: revalidateTag('securities'), etc.

-- ========================================
-- DEPLOYMENT CHECKLIST
-- ========================================

-- [ ] 1. Run this SQL script in Supabase SQL Editor
-- [ ] 2. Verify indexes created (run verification query above)
-- [ ] 3. Test one query with EXPLAIN ANALYZE (should show Index Scan)
-- [ ] 4. Clear browser cache and test record-keeping page
-- [ ] 5. Check server logs for "(CACHED ⚡)" indicators
-- [ ] 6. Measure page load time (should be <1 second)
-- [ ] 7. Monitor index sizes monthly

-- ========================================
-- DONE! Your database is now optimized! 🚀
-- ========================================
