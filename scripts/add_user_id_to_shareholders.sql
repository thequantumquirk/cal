-- Add user_id column to shareholders_new if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shareholders_new' AND column_name = 'user_id') THEN
        ALTER TABLE shareholders_new ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_shareholders_new_user_id ON shareholders_new(user_id);

-- Function to automatically link shareholder records on login/signup
-- (This is usually done via a trigger on auth.users, or lazily in the API)
-- For now, let's run a one-time update to link existing users based on email
UPDATE shareholders_new s
SET user_id = u.id
FROM auth.users u
WHERE s.email = u.email
AND s.user_id IS NULL;
