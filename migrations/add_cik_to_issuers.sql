-- Add CIK (Central Index Key) column to issuers_new table
-- CIK is used to identify companies in SEC EDGAR database
-- Nullable to support existing issuers without CIK values

ALTER TABLE issuers_new
ADD COLUMN cik VARCHAR(10) NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN issuers_new.cik IS 'SEC Central Index Key (CIK) number for fetching SEC filings from EDGAR database';
