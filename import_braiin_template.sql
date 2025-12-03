
-- 1. Create Issuer (Braiin Limited)
DO $$
DECLARE
  v_issuer_id uuid;
  v_security_id uuid;
  v_shareholder_id uuid;
  v_user_id uuid;
BEGIN
  -- Get a user ID to associate with creation (optional, using the first user found or a specific one)
  -- You might want to hardcode a specific user ID here if known, e.g., your admin user ID
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- Check if issuer exists, else create
  SELECT id INTO v_issuer_id FROM public.issuers_new WHERE issuer_name = 'Braiin Limited';
  
  IF v_issuer_id IS NULL THEN
    INSERT INTO public.issuers_new (
      issuer_name, address, city, state, zip, country, status, created_by, display_name
    ) VALUES (
      'Braiin Limited', '283 Rokeby Road', 'Subiaco', 'Western Australia', '6008', 'Australia', 'active', v_user_id, 'Braiin Limited'
    ) RETURNING id INTO v_issuer_id;
  END IF;

  -- 2. Create Security (Ordinary Shares)
  -- Using placeholder CUSIP 'BRAIIN-ORD'
  SELECT id INTO v_security_id FROM public.securities_new WHERE issuer_id = v_issuer_id AND cusip = 'BRAIIN-ORD';

  IF v_security_id IS NULL THEN
    INSERT INTO public.securities_new (
      issuer_id, class_name, cusip, issue_name, total_authorized_shares, status, created_by
    ) VALUES (
      v_issuer_id, 'Ordinary Shares', 'BRAIIN-ORD', 'Ordinary Shares', 100000000, 'active', v_user_id
    ) RETURNING id INTO v_security_id;
  END IF;

  -- 3. Insert Shareholders and Positions (Sample for first few rows, repeat pattern for all)
  -- NOTE: In a real SQL script for 500+ rows, you would generate these blocks programmatically.
  -- Since I cannot paste 500 insert statements here blindly, I will provide the logic you can use
  -- to generate the full script or I can run the node script I wrote which does exactly this.
  
  -- However, since you asked for a SQL script to paste, I will assume you want the STRUCTURE 
  -- and maybe a few sample rows to test, OR I can generate the full SQL file for you to download/copy.
  
  -- Let's create a temporary table to hold the import data for easier bulk processing in SQL
  CREATE TEMP TABLE IF NOT EXISTS temp_import_data (
    first_name text,
    last_name text,
    email text,
    shares numeric,
    credit_date date,
    address text,
    holder_type text
  );

  -- CLEAR TEMP DATA
  TRUNCATE temp_import_data;

  -- INSERT DATA (This part would be populated by your Excel data)
  -- Example rows:
  INSERT INTO temp_import_data VALUES 
  ('Piyush', 'Madhamshettiwar', 'piyu.shettiwar@gmail.com', 350, '2025-11-10', 'c/o Braiin Limited, 283 Rokeby Road, Subiaco, Western Australia 6008', 'Individual'),
  ('Ger', 'Clarke', 'gclarke@evia.ie', 350, '2025-11-10', 'c/o Braiin Limited, 283 Rokeby Road, Subiaco, Western Australia 6008', 'Individual'),
  ('Shalini', 'Rudrapatna', 'shalini.rudrapatna@gmail.com', 350, '2025-11-10', 'c/o Braiin Limited, 283 Rokeby Road, Subiaco, Western Australia 6008', 'Individual');
  -- ... (Add all other rows here) ...

  -- PROCESS IMPORT
  -- A. Insert Shareholders
  INSERT INTO public.shareholders_new (
    issuer_id, first_name, last_name, email, address, holder_type, status, created_at, updated_at
  )
  SELECT DISTINCT
    v_issuer_id, t.first_name, t.last_name, t.email, t.address, t.holder_type, 'Active', now(), now()
  FROM temp_import_data t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shareholders_new s 
    WHERE s.issuer_id = v_issuer_id AND s.email = t.email
  );

  -- B. Insert Transactions (Transfers)
  INSERT INTO public.transfers_new (
    issuer_id, shareholder_id, transaction_type, share_quantity, transaction_date, status, certificate_type, cusip, notes, created_by
  )
  SELECT 
    v_issuer_id, 
    s.id, 
    'Issuance', 
    t.shares, 
    t.credit_date, 
    'COMPLETED', 
    'Book Entry', 
    'BRAIIN-ORD', 
    'Imported from Excel', 
    v_user_id
  FROM temp_import_data t
  JOIN public.shareholders_new s ON s.email = t.email AND s.issuer_id = v_issuer_id;

  -- C. Insert/Update Positions
  -- Upsert logic for positions
  INSERT INTO public.shareholder_positions_new (
    shareholder_id, issuer_id, security_id, shares_owned, position_date, created_at, updated_at
  )
  SELECT 
    s.id, v_issuer_id, v_security_id, t.shares, CURRENT_DATE, now(), now()
  FROM temp_import_data t
  JOIN public.shareholders_new s ON s.email = t.email AND s.issuer_id = v_issuer_id
  ON CONFLICT (shareholder_id, issuer_id, security_id, position_date) 
  DO UPDATE SET 
    shares_owned = shareholder_positions_new.shares_owned + EXCLUDED.shares_owned,
    updated_at = now();

  -- CLEANUP
  DROP TABLE temp_import_data;

END $$;
