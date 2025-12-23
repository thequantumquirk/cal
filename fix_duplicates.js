
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixDuplicates() {
    console.log("🧹 Starting Duplicate Cleanup...");

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

    // 2. Fetch all transactions
    const { data: transfers, error: txError } = await supabase
        .from('transfers_new')
        .select('id, shareholder_id, share_quantity, transaction_date, transaction_type')
        .eq('issuer_id', issuerId)
        .eq('transaction_type', 'Issuance'); // Focus on the ones we imported

    if (txError) {
        console.error("❌ Error fetching transactions:", txError);
        return;
    }
    console.log(`✅ Found ${transfers.length} transactions.`);

    // 3. Identify Duplicates
    const seen = new Map(); // key -> [ids]
    const toDelete = [];

    transfers.forEach(tx => {
        // Create a unique key for the transaction "signature"
        const key = `${tx.shareholder_id}_${tx.share_quantity}_${tx.transaction_date}`;

        if (seen.has(key)) {
            // We have seen this before, so this current 'tx' is a duplicate
            toDelete.push(tx.id);
            seen.get(key).push(tx.id);
        } else {
            seen.set(key, [tx.id]);
        }
    });

    console.log(`🔍 Found ${toDelete.length} duplicate transactions to delete.`);

    if (toDelete.length === 0) {
        console.log("✅ No duplicates found. Proceeding to verify positions...");
    } else {
        // 4. Delete Duplicates
        // Delete in chunks to avoid request limits
        const chunkSize = 100;
        for (let i = 0; i < toDelete.length; i += chunkSize) {
            const chunk = toDelete.slice(i, i + chunkSize);
            const { error: delError } = await supabase
                .from('transfers_new')
                .delete()
                .in('id', chunk);

            if (delError) {
                console.error("❌ Error deleting chunk:", delError);
            } else {
                console.log(`🗑️ Deleted chunk ${i / chunkSize + 1}/${Math.ceil(toDelete.length / chunkSize)}`);
            }
        }
        console.log("✅ Deletion complete.");
    }

    // 5. Recalculate Positions
    console.log("🔄 Recalculating Positions...");

    // Fetch remaining transactions
    const { data: remainingTransfers } = await supabase
        .from('transfers_new')
        .select('shareholder_id, share_quantity')
        .eq('issuer_id', issuerId);

    // Get Security ID
    const { data: securities } = await supabase
        .from('securities_new')
        .select('id')
        .eq('issuer_id', issuerId)
        .single(); // Assuming only one security for now or we take the first one

    const securityId = securities.id;

    // Aggregate
    const positionMap = new Map();
    remainingTransfers.forEach(tx => {
        const current = positionMap.get(tx.shareholder_id) || 0;
        positionMap.set(tx.shareholder_id, current + tx.share_quantity);
    });

    // Prepare Upsert
    const updates = [];
    for (const [shareholderId, totalShares] of positionMap.entries()) {
        updates.push({
            shareholder_id: shareholderId,
            issuer_id: issuerId,
            security_id: securityId,
            shares_owned: totalShares,
            position_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
        });
    }

    // Upsert
    if (updates.length > 0) {
        const { error: upsertError } = await supabase
            .from('shareholder_positions_new')
            .upsert(updates, { onConflict: 'shareholder_id, issuer_id, security_id, position_date' });

        if (upsertError) {
            console.error("❌ Error updating positions:", upsertError);
        } else {
            console.log(`🎉 Successfully corrected ${updates.length} positions!`);
        }
    }
}

fixDuplicates();
