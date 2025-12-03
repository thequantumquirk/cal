
const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = '/Users/bala/EZ/Braiin Cap Table (as of 11.25.25).xlsx';
const OUTPUT_FILE = '/Users/bala/EZ/braiin_import_full.sql';

function excelDateToSQLDate(serial) {
    if (!serial) return 'NULL';
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return `'${date_info.toISOString().split('T')[0]}'`;
}

function escapeSql(str) {
    if (!str) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}

try {
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = 'Record Keeping Book';
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Generating SQL for ${rawData.length} rows...`);

    let sql = `
-- Full Import Script for Braiin Limited
DO $$
DECLARE
  v_issuer_id uuid;
  v_security_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Get User (Admin)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- 2. Get/Create Issuer
  SELECT id INTO v_issuer_id FROM public.issuers_new WHERE issuer_name = 'Braiin Limited';
  
  IF v_issuer_id IS NULL THEN
    INSERT INTO public.issuers_new (
      issuer_name, address, city, state, zip, country, status, created_by, display_name
    ) VALUES (
      'Braiin Limited', '283 Rokeby Road', 'Subiaco', 'Western Australia', '6008', 'Australia', 'active', v_user_id, 'Braiin Limited'
    ) RETURNING id INTO v_issuer_id;
  END IF;

  -- 3. Get/Create Security
  SELECT id INTO v_security_id FROM public.securities_new WHERE issuer_id = v_issuer_id AND cusip = 'BRAIIN-ORD';

  IF v_security_id IS NULL THEN
    INSERT INTO public.securities_new (
      issuer_id, class_name, cusip, issue_name, total_authorized_shares, status, created_by
    ) VALUES (
      v_issuer_id, 'Ordinary Shares', 'BRAIIN-ORD', 'Ordinary Shares', 100000000, 'active', v_user_id
    ) RETURNING id INTO v_security_id;
  END IF;

  -- 4. Create Temp Table
  CREATE TEMP TABLE IF NOT EXISTS temp_import_data (
    first_name text,
    last_name text,
    email text,
    shares numeric,
    credit_date date,
    address text,
    holder_type text
  );
  
  TRUNCATE temp_import_data;

  -- 5. Insert Data
  INSERT INTO temp_import_data (first_name, last_name, email, shares, credit_date, address, holder_type) VALUES
`;

    const values = [];
    for (const row of rawData) {
        const email = row['Email'] ? row['Email'].trim() : null;
        if (!email) continue;

        const firstName = escapeSql(row['First Name']);
        const lastName = escapeSql(row['Last Name']);
        const emailSql = escapeSql(email);
        const shares = row['Shares'] || 0;
        const creditDate = excelDateToSQLDate(row['Credit Date']);
        const address = escapeSql(row['Address']);
        const holderType = escapeSql(row['Holder Type'] || 'Individual');

        values.push(`  (${firstName}, ${lastName}, ${emailSql}, ${shares}, ${creditDate}, ${address}, ${holderType})`);
    }

    sql += values.join(',\n');
    sql += `;\n\n`;

    sql += `
  -- 6. Process Shareholders
  INSERT INTO public.shareholders_new (
    issuer_id, first_name, last_name, email, address, holder_type, tin_status, created_at, updated_at
  )
  SELECT DISTINCT
    v_issuer_id, t.first_name, t.last_name, t.email, t.address, t.holder_type, 'Verified', now(), now()
  FROM temp_import_data t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shareholders_new s 
    WHERE s.issuer_id = v_issuer_id AND s.email = t.email
  );

  -- 7. Process Transactions
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

  -- 8. Process Positions (Upsert)
  -- Note: We group by email to sum shares if multiple rows exist for same person
  INSERT INTO public.shareholder_positions_new (
    shareholder_id, issuer_id, security_id, shares_owned, position_date, created_at, updated_at
  )
  SELECT 
    s.id, v_issuer_id, v_security_id, SUM(t.shares), CURRENT_DATE, now(), now()
  FROM temp_import_data t
  JOIN public.shareholders_new s ON s.email = t.email AND s.issuer_id = v_issuer_id
  GROUP BY s.id
  ON CONFLICT (shareholder_id, issuer_id, security_id, position_date) 
  DO UPDATE SET 
    shares_owned = shareholder_positions_new.shares_owned + EXCLUDED.shares_owned,
    updated_at = now();

  -- Cleanup
  DROP TABLE temp_import_data;

END $$;
`;

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`✅ SQL script generated at: ${OUTPUT_FILE}`);

} catch (error) {
    console.error('Error generating SQL:', error);
}
