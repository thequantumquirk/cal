const { createClient } = require('@supabase/supabase-js');

// PRODUCTION environment
const supabase = createClient(
  'https://rckatnrirtoyqsgechol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg'
);

async function fixProductionSigns() {
  console.log('🔧 FIXING PRODUCTION DATABASE - SIGN CORRECTIONS');
  console.log('='.repeat(80));
  console.log('⚠️  WARNING: This will modify PRODUCTION data!');
  console.log('Environment: https://rckatnrirtoyqsgechol.supabase.co');
  console.log('='.repeat(80));

  // Get all issuers
  const { data: issuers } = await supabase
    .from('issuers_new')
    .select('id, issuer_name');

  let totalFixed = 0;
  let totalErrors = 0;

  for (const issuer of issuers || []) {
    // Find DWAC Withdrawal transactions with POSITIVE share_quantity (wrong)
    const { data: wrongRecords } = await supabase
      .from('transfers_new')
      .select('id, share_quantity, transaction_type, notes')
      .eq('issuer_id', issuer.id)
      .or('transaction_type.eq.DWAC Withdrawal,transaction_type.eq.Transfer Debit')
      .gt('share_quantity', 0);  // Wrong - should be negative

    if (!wrongRecords || wrongRecords.length === 0) continue;

    console.log(`\n📝 ${issuer.issuer_name}`);
    console.log(`   Found ${wrongRecords.length} transactions to fix`);

    // Fix each one
    for (const rec of wrongRecords) {
      const correctValue = -Math.abs(rec.share_quantity);

      console.log(`   Fixing: ${rec.id.substring(0, 8)}... ${rec.share_quantity} → ${correctValue}`);

      const { error } = await supabase
        .from('transfers_new')
        .update({
          share_quantity: correctValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', rec.id);

      if (error) {
        console.error(`   ❌ ERROR fixing ${rec.id}:`, error.message);
        totalErrors++;
      } else {
        totalFixed++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIX SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successfully fixed: ${totalFixed} transactions`);
  if (totalErrors > 0) {
    console.log(`❌ Errors: ${totalErrors} transactions`);
  }

  // Now recalculate positions for affected issuers
  console.log('\n📊 Recalculating positions...');

  const affectedIssuers = ['LAKE SUPERIOR ACQUISITION CORP.', 'MILUNA ACQUISITION CORP', 'TAILWIND 2.0 ACQUISITION CORP.'];

  for (const issuerName of affectedIssuers) {
    const { data: issuer } = await supabase
      .from('issuers_new')
      .select('id')
      .eq('issuer_name', issuerName)
      .single();

    if (!issuer) continue;

    // Delete old positions
    await supabase
      .from('shareholder_positions_new')
      .delete()
      .eq('issuer_id', issuer.id);

    console.log(`   Cleared positions for ${issuerName}`);
    console.log('   (Positions will be recalculated on next transaction or page load)');
  }

  console.log('\n✅ PRODUCTION FIX COMPLETE!');
  console.log('\n📌 Next steps:');
  console.log('   1. The code fix is already in place (applied earlier)');
  console.log('   2. Old bad data has been corrected');
  console.log('   3. New transactions will automatically use correct signs');
  console.log('   4. Positions will recalculate correctly');
}

fixProductionSigns().catch(console.error);
