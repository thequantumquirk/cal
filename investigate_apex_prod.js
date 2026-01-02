// Investigate APEX discrepancy in Production
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const APEX_ID = "adcd093a-2be4-448e-b467-bfb2e07d825c";

async function investigate() {
  console.log("=".repeat(80));
  console.log("APEX TREASURY CORPORATION - DETAILED INVESTIGATION");
  console.log("=".repeat(80));

  // Get all transactions for Units (G04104116)
  const { data: unitsTx, error } = await supabase
    .from("transfers_new")
    .select("*")
    .eq("issuer_id", APEX_ID)
    .eq("cusip", "G04104116")
    .order("transaction_date");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`\n=== APEX UNITS (G04104116) - ${unitsTx?.length || 0} transactions ===`);

  // Group by transaction type and show details
  const byType = {};
  unitsTx?.forEach(t => {
    const type = t.transaction_type || 'UNKNOWN';
    if (!byType[type]) byType[type] = [];
    byType[type].push(t);
  });

  let runningTotal = 0;

  for (const [type, txs] of Object.entries(byType)) {
    const sum = txs.reduce((s, t) => s + (t.share_quantity || 0), 0);
    console.log(`\n${type}: ${txs.length} transactions, sum: ${sum.toLocaleString()}`);

    // Show sample transactions
    txs.slice(0, 3).forEach(t => {
      console.log(`  ${t.transaction_date} | qty: ${t.share_quantity?.toLocaleString().padStart(15)} | notes: ${t.notes?.substring(0, 30) || 'N/A'}`);
    });
    if (txs.length > 3) {
      console.log(`  ... and ${txs.length - 3} more`);
    }
  }

  // Calculate expected vs actual
  const total = unitsTx?.reduce((s, t) => s + (t.share_quantity || 0), 0) || 0;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`CALCULATED TOTAL: ${total.toLocaleString()}`);
  console.log(`DOUG'S EXPECTED:  7,886,132`);
  console.log(`DIFFERENCE:       ${(total - 7886132).toLocaleString()}`);
  console.log(`${"=".repeat(60)}`);

  // Analyze the sign issue
  console.log(`\n=== ANALYZING SIGN ISSUES ===`);

  // DWAC Withdrawal should be negative (shares leaving)
  const dwacWithdrawals = byType['DWAC Withdrawal'] || [];
  const dwacWdPositive = dwacWithdrawals.filter(t => (t.share_quantity || 0) > 0);
  const dwacWdNegative = dwacWithdrawals.filter(t => (t.share_quantity || 0) < 0);

  console.log(`\nDWAC Withdrawal:`);
  console.log(`  Positive qty: ${dwacWdPositive.length} transactions`);
  console.log(`  Negative qty: ${dwacWdNegative.length} transactions`);

  if (dwacWdPositive.length > 0) {
    console.log(`\n  ⚠️ PROBLEM: DWAC Withdrawals should be NEGATIVE (shares leaving)`);
    console.log(`  Sample positive DWAC Withdrawals:`);
    dwacWdPositive.slice(0, 5).forEach(t => {
      console.log(`    ${t.transaction_date} | qty: ${t.share_quantity?.toLocaleString().padStart(12)}`);
    });
  }

  // DWAC Deposit should be positive (shares entering)
  const dwacDeposits = byType['DWAC Deposit'] || [];
  const dwacDepPositive = dwacDeposits.filter(t => (t.share_quantity || 0) > 0);
  const dwacDepNegative = dwacDeposits.filter(t => (t.share_quantity || 0) < 0);

  console.log(`\nDWAC Deposit:`);
  console.log(`  Positive qty: ${dwacDepPositive.length} transactions`);
  console.log(`  Negative qty: ${dwacDepNegative.length} transactions`);

  // Calculate what the total SHOULD be if signs were correct
  console.log(`\n=== RECALCULATION WITH CORRECTED SIGNS ===`);

  let correctedTotal = 0;

  for (const [type, txs] of Object.entries(byType)) {
    let sum = 0;

    txs.forEach(t => {
      const qty = t.share_quantity || 0;

      // For DWAC Withdrawal, qty should be negative
      if (type === 'DWAC Withdrawal') {
        sum += qty > 0 ? -qty : qty;  // Make positive values negative
      }
      // For Debit, qty should be negative
      else if (type === 'Debit') {
        sum += qty > 0 ? -qty : qty;
      }
      // For Credit, qty should be positive
      else if (type === 'Credit') {
        sum += qty < 0 ? -qty : qty;
      }
      // For DWAC Deposit, qty should be positive
      else if (type === 'DWAC Deposit') {
        sum += qty < 0 ? -qty : qty;
      }
      else {
        sum += qty;
      }
    });

    console.log(`${type}: ${sum.toLocaleString()}`);
    correctedTotal += sum;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`CORRECTED TOTAL:  ${correctedTotal.toLocaleString()}`);
  console.log(`DOUG'S EXPECTED:  7,886,132`);
  console.log(`MATCH: ${correctedTotal === 7886132 ? '✅' : '❌'}`);
  console.log(`${"=".repeat(60)}`);

  // Show all transaction types across all CUSIPs to understand the pattern
  console.log(`\n=== ALL APEX TRANSACTION TYPES & SIGNS ===`);

  const { data: allTx } = await supabase
    .from("transfers_new")
    .select("cusip, transaction_type, share_quantity")
    .eq("issuer_id", APEX_ID);

  const signAnalysis = {};
  allTx?.forEach(t => {
    const key = `${t.cusip}|${t.transaction_type}`;
    if (!signAnalysis[key]) {
      signAnalysis[key] = { positive: 0, negative: 0, zero: 0, samples: [] };
    }
    const qty = t.share_quantity || 0;
    if (qty > 0) signAnalysis[key].positive++;
    else if (qty < 0) signAnalysis[key].negative++;
    else signAnalysis[key].zero++;

    if (signAnalysis[key].samples.length < 2) {
      signAnalysis[key].samples.push(qty);
    }
  });

  console.log("\nCUSIP | Type | +ve | -ve | Samples");
  console.log("-".repeat(70));
  for (const [key, data] of Object.entries(signAnalysis).sort()) {
    const [cusip, type] = key.split('|');
    console.log(`${cusip.padEnd(12)} | ${type.padEnd(18)} | ${String(data.positive).padStart(3)} | ${String(data.negative).padStart(3)} | ${data.samples.join(', ')}`);
  }
}

investigate().catch(console.error);
