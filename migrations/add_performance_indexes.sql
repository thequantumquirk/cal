-- Performance Optimization Indexes for Shareholder Pages
-- These indexes will dramatically speed up queries on frequently accessed columns

-- Index for shareholder lookup by email (shareholder-home page)
CREATE INDEX IF NOT EXISTS idx_shareholders_email
ON shareholders_new(email)
WHERE email IS NOT NULL;

-- Index for positions by shareholder_id (used in holdings queries)
CREATE INDEX IF NOT EXISTS idx_positions_shareholder_id
ON shareholder_positions_new(shareholder_id);

-- Index for positions by security_id (used for ownership % calculations)
CREATE INDEX IF NOT EXISTS idx_positions_security_id
ON shareholder_positions_new(security_id);

-- Composite index for positions by issuer_id and security_id
CREATE INDEX IF NOT EXISTS idx_positions_issuer_security
ON shareholder_positions_new(issuer_id, security_id);

-- Index for securities by issuer_id
CREATE INDEX IF NOT EXISTS idx_securities_issuer_id
ON securities_new(issuer_id);

-- Index for restrictions by issuer_id (shareholder-issuer page)
CREATE INDEX IF NOT EXISTS idx_restrictions_issuer_id
ON restrictions(issuer_id);

-- Analyze tables to update statistics for query planner
ANALYZE shareholders_new;
ANALYZE shareholder_positions_new;
ANALYZE securities_new;
ANALYZE issuers_new;
ANALYZE restrictions;

-- Optional: Create a database function for fast security totals aggregation
-- This will be used by the shareholders API if available
CREATE OR REPLACE FUNCTION get_security_totals(security_ids UUID[])
RETURNS TABLE (security_id UUID, shares_owned NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.security_id,
    COALESCE(SUM(sp.shares_owned), 0) as shares_owned
  FROM shareholder_positions_new sp
  WHERE sp.security_id = ANY(security_ids)
  GROUP BY sp.security_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_security_totals(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_totals(UUID[]) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_security_totals IS 'Efficiently calculates total shares owned per security for ownership percentage calculations';
