-- ============================================================================
-- BROKER PROFILES TABLE
-- ============================================================================
-- This table stores broker-specific profile information
-- Used for onboarding brokers and auto-populating request forms

CREATE TABLE IF NOT EXISTS broker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Company Information
  company_name TEXT,
  company_type TEXT, -- 'Broker-Dealer', 'Investment Bank', 'Clearing Firm', etc.

  -- DTC Information (pre-populated in request forms)
  dtc_participant_number TEXT, -- 4-digit DTC number

  -- Primary Contact
  primary_contact_name TEXT,
  primary_contact_phone TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Onboarding Status
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for fetching broker profile by user_id
CREATE INDEX IF NOT EXISTS idx_broker_profiles_user
ON broker_profiles(user_id);

-- Index for DTC participant number lookups
CREATE INDEX IF NOT EXISTS idx_broker_profiles_dtc
ON broker_profiles(dtc_participant_number);

-- Index for onboarding status
CREATE INDEX IF NOT EXISTS idx_broker_profiles_onboarding
ON broker_profiles(onboarding_completed);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_broker_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER broker_profiles_updated_at
  BEFORE UPDATE ON broker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_broker_profiles_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this migration, verify with:
-- SELECT COUNT(*) FROM broker_profiles;
-- SELECT * FROM pg_indexes WHERE tablename = 'broker_profiles';
