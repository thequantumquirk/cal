-- Create normalized schema for document depository
-- Part 1: Document types (master list of SEC filing types)
-- Part 2: Issuer documents (actual documents for each issuer)

-- =====================================================
-- PART 1: Document Types Table
-- =====================================================
CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add common SEC filing types
INSERT INTO document_types (code, name, description, display_order) VALUES
  ('S-1', 'S-1 - Initial Registration Statement', 'Initial registration of securities under the Securities Act of 1933', 1),
  ('S-1/A', 'S-1/A - Amendment to Registration', 'Amendment to the initial registration statement', 2),
  ('424B4', '424B4 - Final Prospectus', 'Prospectus filed pursuant to Rule 424(b)(4)', 3),
  ('8-K', '8-K - Current Report', 'Current report of material events or corporate changes', 4),
  ('10-Q', '10-Q - Quarterly Report', 'Quarterly report with unaudited financial statements', 5),
  ('10-K', '10-K - Annual Report', 'Annual report with audited financial statements', 6),
  ('DEF 14A', 'DEF 14A - Proxy Statement', 'Definitive proxy statement for shareholder meetings', 7),
  ('SUPER 8-K', 'Super 8-K - Business Combination', 'Comprehensive 8-K filed after SPAC merger completion', 8),
  ('S-4', 'S-4 - Business Combination Registration', 'Registration statement for business combination', 9),
  ('IMTA', 'IMTA - Investment Management Trust Agreement', 'Trust agreement for IPO proceeds', 10)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PART 2: Issuer Documents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS issuer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID NOT NULL REFERENCES issuers_new(id) ON DELETE CASCADE,
  document_type_code VARCHAR(20) NOT NULL REFERENCES document_types(code) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  filing_date DATE,
  url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_issuer_documents_issuer_id ON issuer_documents(issuer_id);
CREATE INDEX IF NOT EXISTS idx_issuer_documents_type ON issuer_documents(document_type_code);
CREATE INDEX IF NOT EXISTS idx_document_types_order ON document_types(display_order) WHERE is_active = TRUE;

-- Add comments
COMMENT ON TABLE document_types IS 'Master list of SEC filing types and other document categories';
COMMENT ON TABLE issuer_documents IS 'Stores actual SEC filing documents for each issuer';
COMMENT ON COLUMN document_types.code IS 'Unique code for document type (e.g., S-1, 8-K, 10-Q)';
COMMENT ON COLUMN document_types.display_order IS 'Order to display document types (lower numbers first)';
COMMENT ON COLUMN issuer_documents.document_type_code IS 'References document_types.code';
