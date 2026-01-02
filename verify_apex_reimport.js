// Verify APEX after re-import
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
  console.log("=".repeat(80));
  console.log("APEX TREASURY - POST RE-IMPORT VERIFICATION");
  console.log("=".repeat(80));

  // Find APEX issuer
  const { data: issuers } = await supabase
    .from("issuers_new")
    .select("id, issuer_name")
    .ilike("issuer_name", "%APEX%");

  if (!issuers || issuers.length === 0) {
    console.log("APEX issuer not found!");
    return;
  }

  const apex = issuers[0];
  console.log(`\nFound APEX: ${apex.issuer_name}`);
  console.log(`ID: ${apex.id}`);

  // Get all transactions
  const { data: transactions } = await supabase
    .from("transfers_new")
    .select("cusip, transaction_type, share_quantity, shareholder_id")
    .eq("issuer_id", apex.id);

  console.log(`\nTotal transactions: ${transactions?.length || 0}`);

  // Calculate positions by CUSIP
  const byCusip = {};
  transactions?.forEach(t => {
    const cusip = t.cusip || 'NO_CUSIP';
    if (!byCusip[cusip]) {
      byCusip[cusip] = { count: 0, sum: 0, types: {} };
    }
    byCusip[cusip].count++;
    byCusip[cusip].sum += (t.share_quantity || 0);

    const type = t.transaction_type || 'UNKNOWN';
    if (!byCusip[cusip].types[type]) {
      byCusip[cusip].types[type] = { count: 0, sum: 0 };
    }
    byCusip[cusip].types[type].count++;
    byCusip[cusip].types[type].sum += (t.share_quantity || 0);
  });

  // Expected values from Doug
  const expected = {
    'G04104116': 7886132,   // Units - Doug's expected after DWAC Deposit
    'G04104108': null,      // Class A - need to verify
    'G04104124': null,      // Warrants - need to verify
    'NA': null              // Class B
  };

  console.log("\n=== POSITIONS BY CUSIP ===");
  console.log("-".repeat(70));

  for (const [cusip, data] of Object.entries(byCusip).sort()) {
    const exp = expected[cusip];
    const match = exp !== null ? (data.sum === exp ? '✅' : `❌ Expected: ${exp.toLocaleString()}`) : '';

    console.log(`\n${cusip}:`);
    console.log(`  Outstanding: ${data.sum.toLocaleString()} ${match}`);
    console.log(`  Transactions: ${data.count}`);
    console.log(`  By Type:`);
    for (const [type, typeData] of Object.entries(data.types)) {
      const signCorrect = (type.includes('Withdrawal') || type === 'Debit')
        ? (typeData.sum <= 0 ? '✅' : '⚠️ SHOULD BE NEGATIVE')
        : (type.includes('Deposit') || type === 'Credit' || type === 'IPO')
          ? (typeData.sum >= 0 ? '✅' : '⚠️ SHOULD BE POSITIVE')
          : '';
      console.log(`    ${type}: ${typeData.count} tx, sum: ${typeData.sum.toLocaleString()} ${signCorrect}`);
    }
  }

  // Check shareholder linkage
  const noShareholder = transactions?.filter(t => !t.shareholder_id) || [];
  console.log(`\n=== SHAREHOLDER LINKAGE ===`);
  console.log(`Transactions with shareholder_id: ${(transactions?.length || 0) - noShareholder.length}`);
  console.log(`Transactions without shareholder_id: ${noShareholder.length}`);
  if (noShareholder.length > 0) {
    console.log(`⚠️ ${noShareholder.length} transactions missing shareholder link`);
  }

  // Get shareholders
  const { data: shareholders } = await supabase
    .from("shareholders_new")
    .select("id, account_number, first_name, last_name")
    .eq("issuer_id", apex.id);

  console.log(`\n=== SHAREHOLDERS ===`);
  console.log(`Total: ${shareholders?.length || 0}`);
  shareholders?.forEach(s => {
    const name = `${s.first_name || ''} ${s.last_name || ''}`.trim();
    console.log(`  Account ${s.account_number}: ${name}`);
  });

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  const unitsTotal = byCusip['G04104116']?.sum || 0;
  console.log(`\nUnits (G04104116): ${unitsTotal.toLocaleString()}`);
  console.log(`Doug's Expected:   7,886,132`);
  console.log(`Match: ${unitsTotal === 7886132 ? '✅ CORRECT!' : `❌ Difference: ${(unitsTotal - 7886132).toLocaleString()}`}`);
}

verify().catch(console.error);
