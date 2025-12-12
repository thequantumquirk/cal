
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function compareData() {
    console.log("📊 Starting Comparison: Excel vs Database...");

    // 1. Read Excel Data (The Truth)
    const workbook = XLSX.readFile('/Users/bala/EZ/Braiin Cap Table (as of 11.25.25).xlsx');
    const sheetName = 'Record Keeping Book';
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    const excelMap = new Map(); // email -> total_shares

    excelData.forEach(row => {
        const email = (row['Email'] || '').trim().toLowerCase();
        const shares = Number(row['Shares'] || 0);

        if (email) {
            const current = excelMap.get(email) || 0;
            excelMap.set(email, current + shares);
        }
    });

    console.log(`✅ Loaded ${excelMap.size} unique shareholders from Excel.`);

    // 2. Fetch DB Data
    // We need to join shareholders_new to get the email
    const { data: dbPositions, error } = await supabase
        .from('shareholder_positions_new')
        .select(`
      shares_owned,
      shareholders_new!inner ( email, first_name, last_name ),
      issuers_new!shareholder_positions_new_issuer_id_fkey!inner ( issuer_name )
    `)
        .eq('issuers_new.issuer_name', 'Braiin Limited');

    if (error) {
        console.error("❌ DB Error:", error);
        return;
    }

    const dbMap = new Map(); // email -> shares_owned
    dbPositions.forEach(pos => {
        const email = (pos.shareholders_new.email || '').trim().toLowerCase();
        const shares = Number(pos.shares_owned);

        if (email) {
            // Summing just in case there are multiple positions (though there should be 1 per security)
            const current = dbMap.get(email) || 0;
            dbMap.set(email, current + shares);
        }
    });

    console.log(`✅ Loaded ${dbMap.size} shareholders from Database.`);

    // 3. Compare
    console.log("\n🔍 Discrepancy Report:");
    console.log("----------------------------------------------------------------");
    console.log(String("Email").padEnd(40) + " | " + String("Excel").padStart(10) + " | " + String("DB").padStart(10) + " | " + "Diff");
    console.log("----------------------------------------------------------------");

    let mismatchCount = 0;
    let matchCount = 0;

    // Check all Excel entries against DB
    for (const [email, excelShares] of excelMap.entries()) {
        const dbShares = dbMap.get(email) || 0;

        if (excelShares !== dbShares) {
            mismatchCount++;
            const diff = dbShares - excelShares;
            console.log(`${email.padEnd(40)} | ${String(excelShares).padStart(10)} | ${String(dbShares).padStart(10)} | ${diff > 0 ? '+' + diff : diff}`);
        } else {
            matchCount++;
        }
    }

    // Check for DB entries not in Excel
    for (const [email, dbShares] of dbMap.entries()) {
        if (!excelMap.has(email)) {
            mismatchCount++;
            console.log(`${email.padEnd(40)} | ${String(0).padStart(10)} | ${String(dbShares).padStart(10)} | +${dbShares} (Not in Excel)`);
        }
    }

    console.log("----------------------------------------------------------------");
    console.log(`\n✅ Matches: ${matchCount}`);
    console.log(`❌ Mismatches: ${mismatchCount}`);

    if (mismatchCount > 0) {
        console.log("\n⚠️  Possible Cause: If DB values are exactly double (e.g. +350 becomes 700),");
        console.log("    it means transactions were inserted twice.");
    }
}

compareData();
