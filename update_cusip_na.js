
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateCusipToNA() {
    console.log("🛠️ Updating CUSIP to 'N/A'...");

    // 1. Get Issuer ID
    const { data: issuers } = await supabase
        .from('issuers_new')
        .select('id')
        .eq('issuer_name', 'Braiin Limited')
        .single();

    if (!issuers) {
        console.error("❌ Issuer 'Braiin Limited' not found.");
        return;
    }
    const issuerId = issuers.id;

    // 2. Update Security CUSIP
    const { error: secError } = await supabase
        .from('securities_new')
        .update({ cusip: 'N/A' })
        .eq('issuer_id', issuerId)
        .eq('cusip', 'BRAIIN-ORD'); // Only update the one we created

    if (secError) {
        console.error("❌ Error updating Security CUSIP:", secError);
    } else {
        console.log("✅ Security CUSIP updated to 'N/A'");
    }

    // 3. Update Transactions CUSIP
    const { error: txError } = await supabase
        .from('transfers_new')
        .update({ cusip: 'N/A' })
        .eq('issuer_id', issuerId)
        .eq('cusip', 'BRAIIN-ORD');

    if (txError) {
        console.error("❌ Error updating Transactions CUSIP:", txError);
    } else {
        console.log("✅ Transactions CUSIP updated to 'N/A'");
    }
}

updateCusipToNA();
