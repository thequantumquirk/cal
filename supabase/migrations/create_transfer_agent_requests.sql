-- Create transfer_agent_requests table
-- This table stores all transfer agent requests submitted by brokers

CREATE TABLE IF NOT EXISTS transfer_agent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL, -- e.g., TR-2025-0043
  issuer_id UUID NOT NULL,
  broker_id UUID NOT NULL,

  -- Request details
  request_type TEXT NOT NULL, -- DWAC Deposit, DWAC Withdrawal, Unit Split, Transfer, Certificate Issuance, Other
  request_purpose TEXT, -- For DWAC: For Resale, For Transfer to DTC, Other

  -- Shareholder/Account information
  shareholder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  dtc_number TEXT,

  -- Securities details
  security_type TEXT NOT NULL, -- Class A, Class B, Units, etc.
  quantity NUMERIC NOT NULL,
  cusip TEXT,

  -- Request dates
  requested_completion_date DATE,

  -- Special instructions
  special_instructions TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Under Review, Approved, Processing, Completed, Rejected, More Info Needed
  priority TEXT DEFAULT 'Normal', -- Normal, High, Urgent

  -- Assignment
  assigned_to UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- Timeline
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  review_started_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,

  -- Admin notes (internal, not visible to broker)
  internal_notes TEXT,

  -- Rejection/completion details
  rejection_reason TEXT,
  completion_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transfer_requests_issuer ON transfer_agent_requests(issuer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_broker ON transfer_agent_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_agent_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_assigned ON transfer_agent_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_submitted ON transfer_agent_requests(submitted_at);

-- Create table for request documents
CREATE TABLE IF NOT EXISTS transfer_request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,

  -- Document details
  document_type TEXT NOT NULL, -- Authorization Letter, Transfer Form, Legal Opinion, Other
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,

  -- Document status
  is_required BOOLEAN DEFAULT false,
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- DocuSign integration (future)
  docusign_envelope_id TEXT,
  docusign_status TEXT,

  -- Metadata
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_request_docs_request ON transfer_request_documents(request_id);

-- Create table for request communications/comments
CREATE TABLE IF NOT EXISTS transfer_request_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,

  -- Message details
  user_id UUID NOT NULL,
  message TEXT NOT NULL,

  -- Visibility
  is_internal BOOLEAN DEFAULT false, -- If true, only visible to admins

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_request_comms_request ON transfer_request_communications(request_id);
CREATE INDEX IF NOT EXISTS idx_transfer_request_comms_created ON transfer_request_communications(created_at);

-- Create table for processing steps (for admins to track progress)
CREATE TABLE IF NOT EXISTS transfer_request_processing_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,

  -- Step details
  step_name TEXT NOT NULL, -- DTC Communication Sent, Share Transfer Executed, etc.
  step_description TEXT,
  is_completed BOOLEAN DEFAULT false,

  -- Completion details
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Supporting documents
  confirmation_number TEXT,
  document_url TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_request_steps_request ON transfer_request_processing_steps(request_id);

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  -- Get current year
  year_prefix := TO_CHAR(NOW(), 'YYYY');

  -- Get the latest sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM transfer_agent_requests
  WHERE request_number LIKE 'TR-' || year_prefix || '-%';

  -- Generate the new request number (e.g., TR-2025-0001)
  new_number := 'TR-' || year_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate request number on insert
CREATE OR REPLACE FUNCTION set_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_request_number ON transfer_agent_requests;
CREATE TRIGGER trigger_set_request_number
BEFORE INSERT ON transfer_agent_requests
FOR EACH ROW
EXECUTE FUNCTION set_request_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_transfer_requests_updated_at ON tr ansfer_agent_requests;
CREATE TRIGGER trigger_update_transfer_requests_updated_at
BEFORE UPDATE ON transfer_agent_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
