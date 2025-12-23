/**
 * Check what was actually imported for each security
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImportedData() {
    console.log('🔍 Checking what was actually imported for APEX');
    console.log('='.repeat(80));

    // Get APEX issuer
    const { data: issuer } = await supabase
        .from('issuers_new')
        .select('id, issuer_name')
        .ilike('issuer_name', '%APEX%')
        .single();

    if (!issuer) {
        console.error('❌ APEX issuer not found');
        return;
    }

    console.log(`\n✅ Found issuer: ${issuer.issuer_name} (${issuer.id})\n`);

    // Get all securities
    const { data: securities } = await supabase
        .from('securities_new')
        .select('*')
        .eq('issuer_id', issuer.id)
        .order('cusip');

    console.log('📊 Securities:');
    securities.forEach(sec => {
        console.log(`  - ${sec.class_name} (${sec.cusip || 'N/A'})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('📝 Transactions in transfers_new table:');
    console.log('='.repeat(80));

    for (const sec of securities) {
        const { data: transactions } = await supabase
            .from('transfers_new')
            .select('*')
            .eq('issuer_id', issuer.id)
            .eq('cusip', sec.cusip || 'NA')
            .order('transaction_date', { ascending: true });

        console.log(`\n${sec.class_name} (${sec.cusip || 'N/A'}): ${transactions?.length || 0} transactions`);

        if (transactions && transactions.length > 0) {
            // Show first 3 and last 3
            const showCount = Math.min(3, transactions.length);
            console.log(`\n  First ${showCount} transactions:`);
            transactions.slice(0, showCount).forEach((tx, idx) => {
                const qty = Number(tx.share_quantity) || 0;
                const isDebit = tx.transaction_type?.includes('Withdrawal') || tx.transaction_type?.includes('Debit');
                console.log(`    ${idx + 1}. ${tx.transaction_date?.split('T')[0]} | ${tx.transaction_type} | ${isDebit ? '-' : '+'}${qty.toLocaleString()}`);
            });

            if (transactions.length > 6) {
                console.log(`    ... (${transactions.length - 6} more transactions) ...`);
            }

            if (transactions.length > 3) {
                console.log(`\n  Last ${showCount} transactions:`);
                transactions.slice(-showCount).forEach((tx, idx) => {
                    const qty = Number(tx.share_quantity) || 0;
                    const isDebit = tx.transaction_type?.includes('Withdrawal') || tx.transaction_type?.includes('Debit');
                    console.log(`    ${transactions.length - showCount + idx + 1}. ${tx.transaction_date?.split('T')[0]} | ${tx.transaction_type} | ${isDebit ? '-' : '+'}${qty.toLocaleString()}`);
                });
            }

            // Calculate balance
            let balance = 0;
            transactions.forEach(tx => {
                const qty = Number(tx.share_quantity) || 0;
                const isDebit = tx.transaction_type?.includes('Withdrawal') || tx.transaction_type?.includes('Debit');
                balance += isDebit ? -qty : qty;
            });

            console.log(`\n  ✅ Calculated balance from transactions: ${balance.toLocaleString()}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ANSWER: Why did Units and Warrants work but not Class A?');
    console.log('='.repeat(80));
}

checkImportedData().then(() => {
    console.log('\n✅ Analysis complete\n');
    process.exit(0);
});
