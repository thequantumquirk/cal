/**
 * Delete old Class A transactions for APEX and re-import will fix it
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupClassA() {
    console.log('🧹 Cleaning up APEX Class A transactions');

    // Get APEX issuer
    const { data: issuer } = await supabase
        .from('issuers_new')
        .select('id')
        .ilike('issuer_name', '%APEX%')
        .single();

    if (!issuer) {
        console.error('❌ APEX not found');
        return;
    }

    console.log(`✅ Found APEX issuer: ${issuer.id}`);

    // Delete Class A transactions
    const { error: txError } = await supabase
        .from('transfers_new')
        .delete()
        .eq('issuer_id', issuer.id)
        .eq('cusip', 'G04104108');

    if (txError) {
        console.error('❌ Error deleting transactions:', txError);
        return;
    }

    console.log('✅ Deleted Class A transactions');

    // Delete Class A positions
    const { data: security } = await supabase
        .from('securities_new')
        .select('id')
        .eq('issuer_id', issuer.id)
        .eq('cusip', 'G04104108')
        .single();

    if (security) {
        const { error: posError } = await supabase
            .from('shareholder_positions_new')
            .delete()
            .eq('issuer_id', issuer.id)
            .eq('security_id', security.id);

        if (posError) {
            console.error('❌ Error deleting positions:', posError);
            return;
        }

        console.log('✅ Deleted Class A positions');
    }

    console.log('\n✅ Cleanup complete! Now re-import the APEX Excel file.');
}

cleanupClassA().then(() => process.exit(0));
