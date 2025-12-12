-- Make issuer_id nullable in invited_users_new to support shareholder-only invites
ALTER TABLE invited_users_new ALTER COLUMN issuer_id DROP NOT NULL;
