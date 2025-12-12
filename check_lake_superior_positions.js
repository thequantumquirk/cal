/**
 * Check Lake Superior Cede & Co positions vs actual transactions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLakeSuperior() {
    console.log('🔍 Checking Lake Superior Cede & Co positions');
    console.log('=' * 80);

    // Get Lake Superior issuer
    const { data: issuer } = await supabase
        .from('issuers_new')
        .select('id, issuer_name')
        .ilike('issuer_name', '%Lake Superior%')
        .single();

    if (!issuer) {
        console.error('❌ Lake Superior not found');
        return;
    }

    console.log(`✅ Found: ${issuer.issuer_name} (${issuer.id})\n`);

    // Get Cede & Co shareholder
    const { data: shareholder } = await supabase
        .from('shareholders_new')
        .select('id, shareholder_name')
        .eq('issuer_id', issuer.id)
        .ilike('shareholder_name', '%Cede%')
        .single();

    if (!shareholder) {
        console.error('❌ Cede & Co not found');
        return;
    }

    console.log(`✅ Found shareholder: ${shareholder.shareholder_name} (${shareholder.id})\n`);

    // Get all securities
    const { data: securities } = await supabase
        .from('securities_new')
        .select('*')
        .eq('issuer_id', issuer.id)
        .order('cusip');

    console.log('📊 Checking each security:\n');

    for (const sec of securities) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`${sec.class_name} (${sec.cusip || 'N/A'})`);
        console.log('='.repeat(80));

        // Get position from shareholder_positions_new
        const { data: positions } = await supabase
            .from('shareholder_positions_new')
            .select('*')
            .eq('issuer_id', issuer.id)
            .eq('shareholder_id', shareholder.id)
            .eq('security_id', sec.id)
            .order('position_date', { ascending: false });

        console.log(`\n📋 Positions in shareholder_positions_new: ${positions?.length || 0}`);
        if (positions && positions.length > 0) {
            positions.forEach((pos, idx) => {
                console.log(`  ${idx + 1}. Date: ${pos.position_date}, Shares: ${pos.shares_owned.toLocaleString()}`);
            });

            const totalFromPositions = positions.reduce((sum, p) => sum + p.shares_owned, 0);
            console.log(`  ⚠️  SUM of all positions: ${totalFromPositions.toLocaleString()}`);
        }

        // Calculate from transactions
        const { data: transactions } = await supabase
            .from('transfers_new')
            .select('*')
            .eq('issuer_id', issuer.id)
            .eq('shareholder_id', shareholder.id)
            .eq('cusip', sec.cusip || 'NA')
            .eq('status', 'ACTIVE')
            .order('transaction_date');

        console.log(`\n📝 Transactions in transfers_new: ${transactions?.length || 0}`);

        if (transactions && transactions.length > 0) {
            let balance = 0;
            transactions.forEach((tx, idx) => {
                const qty = Number(tx.share_quantity) || 0;
                const isDebit = tx.transaction_type?.includes('Withdrawal') || tx.transaction_type?.includes('Debit');
                balance += isDebit ? -qty : qty;

                if (idx < 5) {
                    console.log(`  ${idx + 1}. ${tx.transaction_date}: ${tx.transaction_type} ${isDebit ? '-' : '+'}${qty.toLocaleString()} → Balance: ${balance.toLocaleString()}`);
                }
            });

            if (transactions.length > 5) {
                console.log(`  ... (${transactions.length - 5} more transactions)`);
            }

            console.log(`\n  ✅ CORRECT balance from transactions: ${balance.toLocaleString()}`);

            if (positions && positions.length > 0) {
                const positionTotal = positions.reduce((sum, p) => sum + p.shares_owned, 0);
                if (positionTotal !== balance) {
                    console.log(`  ❌ MISMATCH! Position table shows: ${positionTotal.toLocaleString()}`);
                    console.log(`  📊 Difference: ${(positionTotal - balance).toLocaleString()}`);
                }
            }
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete');
}

checkLakeSuperior().then(() => process.exit(0));
