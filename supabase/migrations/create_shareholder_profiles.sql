-- ============================================================================
-- SHAREHOLDER PROFILES TABLE
-- ============================================================================
-- This table stores shareholder-specific profile information
-- Used for onboarding shareholders via invitation flow and email OTP verification

CREATE TABLE IF NOT EXISTS shareholder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile Information (pre-filled from shareholders_new, editable during onboarding)
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,

  -- Address Fields
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',

  -- Email OTP Fields (same pattern as broker_profiles)
  email_otp_code TEXT,
  email_otp_expires_at TIMESTAMP WITH TIME ZONE,
  email_otp_verified BOOLEAN DEFAULT false,
  email_otp_verified_at TIMESTAMP WITH TIME ZONE,

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
-- Index for fetching shareholder profile by user_id
CREATE INDEX IF NOT EXISTS idx_shareholder_profiles_user
ON shareholder_profiles(user_id);

-- Index for onboarding status
CREATE INDEX IF NOT EXISTS idx_shareholder_profiles_onboarding
ON shareholder_profiles(onboarding_completed);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_shareholder_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shareholder_profiles_updated_at
  BEFORE UPDATE ON shareholder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_shareholder_profiles_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE shareholder_profiles IS 'Stores shareholder profile data for onboarding and OTP verification';
COMMENT ON COLUMN shareholder_profiles.first_name IS 'Shareholder first name';
COMMENT ON COLUMN shareholder_profiles.last_name IS 'Shareholder last name';
COMMENT ON COLUMN shareholder_profiles.phone_number IS 'Primary phone number';
COMMENT ON COLUMN shareholder_profiles.email_otp_code IS 'Temporary 6-digit OTP code for email verification';
COMMENT ON COLUMN shareholder_profiles.email_otp_expires_at IS 'Expiry time for the OTP code';
COMMENT ON COLUMN shareholder_profiles.email_otp_verified IS 'Whether email has been verified via OTP';
COMMENT ON COLUMN shareholder_profiles.email_otp_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN shareholder_profiles.onboarding_completed IS 'Whether shareholder has completed onboarding';
COMMENT ON COLUMN shareholder_profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this migration, verify with:
-- SELECT COUNT(*) FROM shareholder_profiles;
-- SELECT * FROM pg_indexes WHERE tablename = 'shareholder_profiles';
