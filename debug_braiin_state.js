
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkData() {
    console.log("🔍 Checking DB State...");

    // 1. Get Issuer
    const { data: issuers, error: issuerError } = await supabase
        .from('issuers_new')
        .select('id, issuer_name')
        .eq('issuer_name', 'Braiin Limited');

    if (issuerError) console.error("Issuer Error:", issuerError);
    console.log("Issuers found:", issuers);

    if (!issuers || issuers.length === 0) return;
    const issuerId = issuers[0].id;

    // 2. Get Securities
    const { data: securities, error: secError } = await supabase
        .from('securities_new')
        .select('*')
        .eq('issuer_id', issuerId);

    if (secError) console.error("Security Error:", secError);
    console.log("\nSecurities found:", securities);

    // 3. Get Positions Sample
    const { data: positions, error: posError } = await supabase
        .from('shareholder_positions_new')
        .select('id, shareholder_id, security_id, shares_owned')
        .eq('issuer_id', issuerId)
        .limit(5);

    if (posError) console.error("Positions Error:", posError);
    console.log("\nPositions Sample:", positions);

    // 4. Get Transfers Sample
    const { data: transfers, error: transError } = await supabase
        .from('transfers_new')
        .select('id, cusip, share_quantity')
        .eq('issuer_id', issuerId)
        .limit(5);

    if (transError) console.error("Transfers Error:", transError);
    console.log("\nTransfers Sample:", transfers);
}

checkData();
