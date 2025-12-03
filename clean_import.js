
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function excelDateToJSDate(serial) {
    if (!serial) return new Date().toISOString();
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString();
}

async function cleanSlateImport() {
    console.log("🚀 Starting Clean Slate Import for Braiin Limited...");

    // 1. Get Issuer & Security IDs
    const { data: issuers } = await supabase.from('issuers_new').select('id').eq('issuer_name', 'Braiin Limited').single();
    if (!issuers) { console.error("❌ Issuer not found"); return; }
    const issuerId = issuers.id;

    const { data: securities } = await supabase.from('securities_new').select('id').eq('issuer_id', issuerId).limit(1);
    if (!securities || securities.length === 0) { console.error("❌ Security not found"); return; }
    const securityId = securities[0].id;

    console.log(`✅ Issuer: ${issuerId}`);
    console.log(`✅ Security: ${securityId}`);

    // 2. DELETE ALL Transactions & Positions for this Issuer
    console.log("🗑️  Wiping existing data...");

    await supabase.from('shareholder_positions_new').delete().eq('issuer_id', issuerId);
    await supabase.from('transfers_new').delete().eq('issuer_id', issuerId);

    console.log("✅ Data wiped.");

    // 3. Read Excel
    console.log("📂 Reading Excel...");
    const workbook = XLSX.readFile('/Users/bala/EZ/Braiin Cap Table (as of 11.25.25).xlsx');
    const sheet = workbook.Sheets['Record Keeping Book'];
    const data = XLSX.utils.sheet_to_json(sheet);

    // 4. Prepare Data
    const transfers = [];
    const positionsMap = new Map(); // shareholder_id -> shares

    // We need shareholder IDs. Let's fetch them all first to map email -> id
    const { data: shareholders } = await supabase
        .from('shareholders_new')
        .select('id, email')
        .eq('issuer_id', issuerId);

    const emailToId = new Map();
    shareholders.forEach(s => emailToId.set(s.email.toLowerCase(), s.id));

    console.log(`✅ Loaded ${emailToId.size} shareholders.`);

    data.forEach(row => {
        const email = (row['Email'] || '').trim().toLowerCase();
        if (!email || !emailToId.has(email)) return;

        const shareholderId = emailToId.get(email);
        const shares = Number(row['Shares'] || 0);
        const date = excelDateToJSDate(row['Credit Date']);

        // Add Transfer
        transfers.push({
            issuer_id: issuerId,
            shareholder_id: shareholderId,
            transaction_type: 'Issuance',
            share_quantity: shares,
            transaction_date: date,
            status: 'COMPLETED',
            certificate_type: 'Book Entry',
            cusip: 'N/A', // Correct CUSIP
            notes: 'Clean Slate Import',
            created_by: '40ad4854-e6fc-404b-855a-205b3f8de4c5' // Using the ID we saw earlier
        });

        // Update Position Map
        const current = positionsMap.get(shareholderId) || 0;
        positionsMap.set(shareholderId, current + shares);
    });

    // 5. Insert Transfers (in chunks)
    console.log(`💾 Inserting ${transfers.length} transactions...`);
    const chunkSize = 100;
    for (let i = 0; i < transfers.length; i += chunkSize) {
        const chunk = transfers.slice(i, i + chunkSize);
        const { error } = await supabase.from('transfers_new').insert(chunk);
        if (error) console.error("❌ Insert Error:", error);
    }

    // 6. Insert Positions
    console.log(`💾 Inserting ${positionsMap.size} positions...`);
    const positions = [];
    for (const [sid, shares] of positionsMap.entries()) {
        positions.push({
            shareholder_id: sid,
            issuer_id: issuerId,
            security_id: securityId,
            shares_owned: shares,
            position_date: new Date().toISOString().split('T')[0]
        });
    }

    const { error: posError } = await supabase.from('shareholder_positions_new').insert(positions);
    if (posError) console.error("❌ Position Insert Error:", posError);

    console.log("🎉 Clean Slate Import Complete!");
}

cleanSlateImport();
