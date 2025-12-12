
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixPositions() {
    console.log("🛠️ Starting Position Fix Script...");

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
    console.log(`✅ Issuer ID: ${issuerId}`);

    // 2. Get Security ID
    const { data: securities } = await supabase
        .from('securities_new')
        .select('id')
        .eq('issuer_id', issuerId)
        .eq('cusip', 'N/A') // We updated this earlier
        .single();

    if (!securities) {
        console.error("❌ Security not found.");
        return;
    }
    const securityId = securities.id;
    console.log(`✅ Security ID: ${securityId}`);

    // 3. Fetch all transactions (transfers)
    const { data: transfers, error: txError } = await supabase
        .from('transfers_new')
        .select('shareholder_id, share_quantity, transaction_type')
        .eq('issuer_id', issuerId);

    if (txError) {
        console.error("❌ Error fetching transactions:", txError);
        return;
    }
    console.log(`✅ Found ${transfers.length} transactions.`);

    // 4. Aggregate Shares by Shareholder
    const positionMap = new Map(); // shareholder_id -> total_shares

    transfers.forEach(tx => {
        const current = positionMap.get(tx.shareholder_id) || 0;
        // Assuming all are 'Issuance' or 'Credit' for now based on import
        // If you have debits, handle them:
        // if (tx.transaction_type === 'Debit') ...
        positionMap.set(tx.shareholder_id, current + tx.share_quantity);
    });

    console.log(`✅ Calculated positions for ${positionMap.size} shareholders.`);

    // 5. Upsert Positions
    const updates = [];
    for (const [shareholderId, totalShares] of positionMap.entries()) {
        updates.push({
            shareholder_id: shareholderId,
            issuer_id: issuerId,
            security_id: securityId,
            shares_owned: totalShares,
            position_date: new Date().toISOString().split('T')[0], // Today
            updated_at: new Date().toISOString()
        });
    }

    if (updates.length > 0) {
        const { error: upsertError } = await supabase
            .from('shareholder_positions_new')
            .upsert(updates, { onConflict: 'shareholder_id, issuer_id, security_id, position_date' });

        if (upsertError) {
            console.error("❌ Error updating positions:", upsertError);
        } else {
            console.log(`🎉 Successfully updated ${updates.length} positions!`);
        }
    } else {
        console.log("No positions to update.");
    }
}

fixPositions();
