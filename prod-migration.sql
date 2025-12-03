-- ============================================================================
-- PRODUCTION DATABASE MIGRATION SCRIPT
-- Purpose: Add missing tables that exist in DEV but not in PROD
-- Date: 2025-11-18
-- ============================================================================

-- ====================
-- 1. shareholder_positions_new (CRITICAL - fixes the import error)
-- ====================
CREATE TABLE IF NOT EXISTS public.shareholder_positions_new (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  shareholder_id uuid NOT NULL,
  issuer_id uuid NOT NULL,
  security_id uuid NOT NULL,
  position_date date NOT NULL DEFAULT CURRENT_DATE,
  shares_owned bigint NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT shareholder_positions_new_pkey PRIMARY KEY (id),
  CONSTRAINT shareholder_positions_new_unique UNIQUE (
    shareholder_id,
    issuer_id,
    security_id,
    position_date
  ),
  CONSTRAINT fk_spn_security FOREIGN KEY (security_id) REFERENCES securities_new (id) ON DELETE CASCADE,
  CONSTRAINT shareholder_positions_new_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES issuers_new (id) ON DELETE CASCADE,
  CONSTRAINT fk_spn_issuer FOREIGN KEY (issuer_id) REFERENCES issuers_new (id) ON DELETE CASCADE,
  CONSTRAINT shareholder_positions_new_security_id_fkey FOREIGN KEY (security_id) REFERENCES securities_new (id) ON DELETE CASCADE,
  CONSTRAINT shareholder_positions_new_shareholder_id_fkey FOREIGN KEY (shareholder_id) REFERENCES shareholders_new (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Indexes for shareholder_positions_new
CREATE INDEX IF NOT EXISTS idx_spn_shareholder ON public.shareholder_positions_new USING btree (shareholder_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_spn_issuer ON public.shareholder_positions_new USING btree (issuer_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_spn_security ON public.shareholder_positions_new USING btree (security_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_spn_date ON public.shareholder_positions_new USING btree (position_date) TABLESPACE pg_default;

-- ====================
-- 2. recordkeeping_transactions_prototype
-- ====================
CREATE TABLE IF NOT EXISTS public.recordkeeping_transactions_prototype (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issuer_id uuid NULL,
  issue_name text NULL,
  issue_ticker text NULL,
  trading_platform text NULL,
  cusip text NULL,
  security_type text NULL,
  issuance_type text NULL,
  shareholder_id uuid NULL,
  shareholder_account text NULL,
  transaction_type text NULL,
  credit_debit text NULL,
  transaction_date text NULL,
  quantity bigint NULL,
  certificate_type text NULL,
  status text NULL,
  notes text NULL,
  raw_row jsonb NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT recordkeeping_transactions_prototype_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ====================
-- 3. restrictions (if needed - check if it exists)
-- ====================
CREATE TABLE IF NOT EXISTS public.restrictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL,
  code text NOT NULL,
  legend text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT restrictions_pkey PRIMARY KEY (id),
  CONSTRAINT restrictions_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES issuers_new (id) ON DELETE CASCADE,
  CONSTRAINT restrictions_code_check CHECK ((char_length(code) <= 2))
) TABLESPACE pg_default;

-- Index for restrictions
CREATE INDEX IF NOT EXISTS idx_restrictions_issuer_id ON public.restrictions USING btree (issuer_id) TABLESPACE pg_default;

-- ====================
-- 4. Transfer Agent Tables (if schemas are available)
-- ====================
-- NOTE: You mentioned these tables are missing in PROD:
-- - transfer_agent_requests
-- - transfer_request_communications
-- - transfer_request_documents
-- - transfer_request_processing_steps
--
-- To add them, please run this in DEV to get their schemas:
-- pg_dump --schema-only -t transfer_agent_requests -t transfer_request_communications -t transfer_request_documents -t transfer_request_processing_steps your_db_name
-- Then paste the output below and run this script again.

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this migration, verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================================
