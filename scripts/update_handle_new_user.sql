-- Update the handle_new_user function to check for ALL pending invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record record;
  first_invite_found boolean := false;
BEGIN
  -- 1. Loop through ALL pending invitations for this email
  FOR invite_record IN SELECT * FROM invited_users_new WHERE email = new.email LOOP
    
    -- If this is the first invite we process, use it to set the user's main profile name if needed
    IF NOT first_invite_found THEN
       -- We can optionally update the user's name if it's missing
       IF new.raw_user_meta_data->>'full_name' IS NULL THEN
          UPDATE public.users_new 
          SET name = COALESCE(invite_record.name, new.email)
          WHERE id = new.id;
       END IF;
       first_invite_found := true;
    END IF;

    -- 2. Link to the issuer for this specific invitation
    IF invite_record.issuer_id IS NOT NULL THEN
      INSERT INTO public.issuer_users_new (user_id, issuer_id, role_id, created_at, updated_at)
      VALUES (
        new.id, 
        invite_record.issuer_id, 
        invite_record.role_id, 
        now(), 
        now()
      )
      ON CONFLICT (user_id, issuer_id) DO NOTHING; -- Prevent errors if already linked
    END IF;

    -- 3. Delete this specific invitation
    DELETE FROM invited_users_new WHERE id = invite_record.id;
    
  END LOOP;

  -- 4. If no invitations were found, ensure the user exists in users_new (default fallback)
  -- We check if the user exists in users_new first to avoid duplicates if the loop above didn't run
  INSERT INTO public.users_new (id, email, name, created_at, updated_at)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    now(), 
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;
