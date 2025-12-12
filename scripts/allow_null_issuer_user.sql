-- Make issuer_id nullable in issuer_users_new to support platform-level roles
ALTER TABLE public.issuer_users_new ALTER COLUMN issuer_id DROP NOT NULL;
