-- ============================================================================
-- ADD BROKER PROFILE FIELDS FOR ACCOUNT SETUP
-- ============================================================================
-- Migration to add fields required by the broker onboarding account setup form
-- Fields: first_name, last_name, company_address, phone_number, dtcc_participant_number

-- Add first_name column
ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column
ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add company_address (single field for full address)
-- Note: This is in addition to the existing address_line1, address_line2, city, state, zip_code fields
ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS company_address TEXT;

-- Add phone_number column
-- Note: This is in addition to the existing primary_contact_phone field
ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add dtcc_participant_number column (alternate naming)
-- Note: The table already has dtc_participant_number, this is an alias for consistency with the form
ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS dtcc_participant_number TEXT;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN broker_profiles.first_name IS 'Broker contact first name';
COMMENT ON COLUMN broker_profiles.last_name IS 'Broker contact last name';
COMMENT ON COLUMN broker_profiles.company_address IS 'Full company address (single field)';
COMMENT ON COLUMN broker_profiles.phone_number IS 'Primary phone number';
COMMENT ON COLUMN broker_profiles.dtcc_participant_number IS 'DTCC Participant Number (4-digit)';

-- ============================================================================
-- EMAIL OTP FIELDS
-- ============================================================================
-- Add columns for email OTP verification

ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS email_otp_code TEXT;

ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS email_otp_verified BOOLEAN DEFAULT false;

ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS email_otp_verified_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN broker_profiles.email_otp_code IS 'Temporary 6-digit OTP code for email verification';
COMMENT ON COLUMN broker_profiles.email_otp_expires_at IS 'Expiry time for the OTP code';
COMMENT ON COLUMN broker_profiles.email_otp_verified IS 'Whether email has been verified via OTP';
COMMENT ON COLUMN broker_profiles.email_otp_verified_at IS 'Timestamp when email was verified';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify with:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'broker_profiles' ORDER BY ordinal_position;
