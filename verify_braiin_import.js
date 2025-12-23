
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";
const FILE_PATH = '/Users/bala/EZ/Braiin Cap Table (as of 12.5.25).xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
    console.log("🔍 Verifying Braiin Limited Import...");

    // 1. Calculate Expected from Excel
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets['Record Keeping Book'];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let expectedShares = 0;
    let expectedRows = 0;
    const expectedLockups = new Set();

    for (const row of rows) {
        if (!row['Email']) continue;
        expectedRows++;
        expectedShares += Number(row['Shares'] || 0);

        if (row['Lock-up Language'] && row['Lock-up Language'] !== 'None') {
            expectedLockups.add(row['Lock-up Language']);
        }
    }

    console.log(`\n📊 Excel Source Data:`);
    console.log(`- Total Rows: ${expectedRows}`);
    console.log(`- Total Shares: ${expectedShares.toLocaleString()}`);
    console.log(`- Unique Lockup Clauses: ${expectedLockups.size}`);

    // 2. Fetch from DB
    const { data: issuer } = await supabase.from('issuers_new').select('id').eq('issuer_name', 'Braiin Limited').single();
    if (!issuer) {
        console.error("❌ Issuer 'Braiin Limited' not found in DB!");
        return;
    }

    // Sum Shares
    const { data: transfers } = await supabase
        .from('transfers_new')
        .select('share_quantity, restriction_id, notes')
        .eq('issuer_id', issuer.id);

    let dbShares = 0;
    let dbRows = 0;
    let dbRestrictedCount = 0;

    transfers.forEach(t => {
        dbRows++;
        dbShares += t.share_quantity;
        if (t.restriction_id) dbRestrictedCount++;
    });

    console.log(`\n🗄️  Database Data (Issuer ID: ${issuer.id}):`);
    console.log(`- Total Transfers: ${dbRows}`);
    console.log(`- Total Shares: ${dbShares.toLocaleString()}`);
    console.log(`- Transfers with Restrictions: ${dbRestrictedCount}`);

    // Check Templates
    const { data: templates } = await supabase
        .from('restrictions_templates_new')
        .select('*')
        .eq('issuer_id', issuer.id);

    console.log(`\n🔒 Restriction Templates Created: ${templates.length}`);
    templates.forEach(t => {
        console.log(`  - [${t.restriction_type}] ${t.restriction_name}: ${t.description.substring(0, 50)}...`);
    });

    // 3. Comparison
    console.log(`\n⚖️  Comparison:`);
    const sharesMatch = Math.abs(expectedShares - dbShares) < 0.01;
    const rowsMatch = expectedRows === dbRows;

    if (sharesMatch) console.log("✅ Total Shares MATCH!");
    else console.error(`❌ Total Shares MISMATCH! Diff: ${expectedShares - dbShares}`);

    if (rowsMatch) console.log("✅ Row Count MATCH!");
    else console.error(`❌ Row Count MISMATCH! Diff: ${expectedRows - dbRows}`);

}

verify();
