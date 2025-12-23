-- Migration: Add ticker_symbol column to issuers_new table
-- This field stores the primary trading ticker for the issuer's stock chart
-- Date: 2025-12-09

-- Add the ticker_symbol column (nullable, text)
ALTER TABLE issuers_new 
ADD COLUMN IF NOT EXISTS ticker_symbol TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN issuers_new.ticker_symbol IS 'Primary ticker symbol for market data visualization (e.g., CRAU, AAPL). Used by TradingView widget.';

-- Optionally populate from securities table (first active security with a ticker)
-- This updates issuers that have at least one security with an issue_ticker
UPDATE issuers_new i
SET ticker_symbol = (
  SELECT s.issue_ticker 
  FROM securities_new s 
  WHERE s.issuer_id = i.id 
    AND s.issue_ticker IS NOT NULL 
    AND s.issue_ticker != 'NA'
    AND s.issue_ticker != ''
    AND s.status = 'active'
  ORDER BY 
    CASE 
      WHEN s.class_name ILIKE '%unit%' THEN 1
      WHEN s.class_name ILIKE '%class a%' THEN 2
      ELSE 3
    END
  LIMIT 1
)
WHERE i.ticker_symbol IS NULL;

-- Log what was updated
SELECT 
  issuer_name,
  ticker_symbol,
  exchange_platform
FROM issuers_new 
WHERE ticker_symbol IS NOT NULL;
