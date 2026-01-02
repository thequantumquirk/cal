-- =====================================================
-- BROKER REQUEST MODULE - DATABASE MIGRATION SCRIPT
-- =====================================================
-- Copy and paste this script into Supabase SQL Editor
-- This adds fields required for broker-initiated split requests
-- and email action tokens for approve/reject functionality
-- =====================================================

-- Add new columns to transfer_agent_requests table
ALTER TABLE transfer_agent_requests
ADD COLUMN IF NOT EXISTS dtc_participant_number TEXT, -- 4-digit DTC participant number
ADD COLUMN IF NOT EXISTS broker_account_at_dtc TEXT, -- Broker's account number at DTC
ADD COLUMN IF NOT EXISTS dwac_submitted BOOLEAN DEFAULT false, -- Has broker submitted DWAC to DTC
ADD COLUMN IF NOT EXISTS units_quantity NUMERIC, -- Number of units for split
ADD COLUMN IF NOT EXISTS class_a_shares_quantity NUMERIC, -- Expected Class A shares from split
ADD COLUMN IF NOT EXISTS warrants_rights_quantity NUMERIC, -- Expected warrants/rights from split
ADD COLUMN IF NOT EXISTS units_cusip TEXT, -- CUSIP for Units
ADD COLUMN IF NOT EXISTS class_a_cusip TEXT, -- CUSIP for Class A shares
ADD COLUMN IF NOT EXISTS warrants_cusip TEXT, -- CUSIP for Warrants/Rights
ADD COLUMN IF NOT EXISTS action_token TEXT UNIQUE, -- One-time token for email actions
ADD COLUMN IF NOT EXISTS action_token_expires_at TIMESTAMP WITH TIME ZONE, -- Token expiration
ADD COLUMN IF NOT EXISTS action_token_used_at TIMESTAMP WITH TIME ZONE, -- When token was used
ADD COLUMN IF NOT EXISTS approved_by UUID, -- Admin who approved
ADD COLUMN IF NOT EXISTS rejected_by UUID; -- Admin who rejected

-- Add index for action token lookups
CREATE INDEX IF NOT EXISTS idx_transfer_requests_action_token ON transfer_agent_requests(action_token);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_dtc ON transfer_agent_requests(dtc_participant_number);

-- Create table for tracking broker request email actions
CREATE TABLE IF NOT EXISTS broker_request_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES transfer_agent_requests(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'approve' or 'reject'
  action_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID,
  rejection_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_actions_token ON broker_request_actions(action_token);
CREATE INDEX IF NOT EXISTS idx_broker_actions_request ON broker_request_actions(request_id);

-- Function to generate secure action token
CREATE OR REPLACE FUNCTION generate_action_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token (64 characters)
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COLUMN DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN transfer_agent_requests.dtc_participant_number IS '4-digit DTC participant number identifying the broker';
COMMENT ON COLUMN transfer_agent_requests.broker_account_at_dtc IS 'Broker account number at DTC for the transfer';
COMMENT ON COLUMN transfer_agent_requests.dwac_submitted IS 'Whether broker has already submitted DWAC request to DTC';
COMMENT ON COLUMN transfer_agent_requests.units_quantity IS 'Number of units being split';
COMMENT ON COLUMN transfer_agent_requests.class_a_shares_quantity IS 'Expected Class A shares from the split';
COMMENT ON COLUMN transfer_agent_requests.warrants_rights_quantity IS 'Expected warrants/rights from the split';
COMMENT ON COLUMN transfer_agent_requests.units_cusip IS 'CUSIP identifier for the Units security';
COMMENT ON COLUMN transfer_agent_requests.class_a_cusip IS 'CUSIP identifier for Class A shares';
COMMENT ON COLUMN transfer_agent_requests.warrants_cusip IS 'CUSIP identifier for Warrants/Rights';
COMMENT ON COLUMN transfer_agent_requests.action_token IS 'One-time token for approve/reject email actions';
