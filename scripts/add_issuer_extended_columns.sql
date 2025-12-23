-- Add extended columns to issuers_new table for settings page
-- These columns were missing and causing the "Failed to update issuer" error

-- Basic Information
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS issuer_name TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Company Details
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS incorporation TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS underwriter TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS share_info TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS notes TEXT;

-- Regulatory Information
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS forms_sl_status TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS ticker_symbol TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS exchange_platform TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS cik TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS timeframe_for_separation TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS separation_ratio TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS timeframe_for_bc TEXT;

-- Legal Counsel
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS us_counsel TEXT;
ALTER TABLE issuers_new ADD COLUMN IF NOT EXISTS offshore_counsel TEXT;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'issuers_new'
ORDER BY ordinal_position;
