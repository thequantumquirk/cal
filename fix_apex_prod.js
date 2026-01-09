// Fix APEX Production - DWAC Withdrawals with wrong sign
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const APEX_ID = "adcd093a-2be4-448e-b467-bfb2e07d825c";

async function fix() {
  console.log("=".repeat(80));
  console.log("FIXING APEX PRODUCTION - DWAC WITHDRAWAL SIGN ISSUE");
  console.log("=".repeat(80));

  // Get DWAC Withdrawals with positive quantities (wrong sign)
  const { data: wrongSign, error } = await supabase
    .from("transfers_new")
    .select("id, cusip, share_quantity, transaction_date, notes")
    .eq("issuer_id", APEX_ID)
    .eq("transaction_type", "DWAC Withdrawal")
    .gt("share_quantity", 0);  // Positive when should be negative

  if (error) {
    console.error("Error fetching:", error);
    return;
  }

  console.log(`\nFound ${wrongSign?.length || 0} DWAC Withdrawals with POSITIVE quantities (wrong)`);

  if (!wrongSign || wrongSign.length === 0) {
    console.log("No transactions to fix!");
    return;
  }

  console.log("\nTransactions to fix:");
  wrongSign.forEach((t, i) => {
    console.log(`  ${i+1}. ${t.transaction_date} | ${t.cusip} | qty: ${t.share_quantity.toLocaleString().padStart(12)} → ${(-t.share_quantity).toLocaleString().padStart(12)}`);
  });

  // Calculate impact
  const totalWrongPositive = wrongSign.reduce((s, t) => s + t.share_quantity, 0);
  console.log(`\nTotal wrong positive: ${totalWrongPositive.toLocaleString()}`);
  console.log(`Impact on outstanding: ${(2 * totalWrongPositive).toLocaleString()} (will be subtracted)`);

  // Get current Units total
  const { data: unitsTx } = await supabase
    .from("transfers_new")
    .select("share_quantity")
    .eq("issuer_id", APEX_ID)
    .eq("cusip", "G04104116");

  const currentTotal = unitsTx?.reduce((s, t) => s + (t.share_quantity || 0), 0) || 0;
  const correctedTotal = currentTotal - (2 * totalWrongPositive);

  console.log(`\nCurrent Units total:   ${currentTotal.toLocaleString()}`);
  console.log(`Corrected Units total: ${correctedTotal.toLocaleString()}`);
  console.log(`Doug's expected:       7,886,132`);

  // ⚠️ CONFIRMATION REQUIRED - This modifies production data!
  console.log("\n" + "⚠️".repeat(30));
  console.log("  THIS WILL MODIFY PRODUCTION DATA!");
  console.log("⚠️".repeat(30));

  // Fix each transaction
  console.log("\n🔧 Fixing transactions...");

  for (const t of wrongSign) {
    const correctedQty = -t.share_quantity;

    const { error: updateError } = await supabase
      .from("transfers_new")
      .update({ share_quantity: correctedQty })
      .eq("id", t.id);

    if (updateError) {
      console.error(`  ❌ Error fixing ${t.id}: ${updateError.message}`);
    } else {
      console.log(`  ✅ Fixed ${t.id}: ${t.share_quantity} → ${correctedQty}`);
    }
  }

  // Verify
  console.log("\n=== VERIFICATION ===");

  const { data: verifyTx } = await supabase
    .from("transfers_new")
    .select("share_quantity")
    .eq("issuer_id", APEX_ID)
    .eq("cusip", "G04104116");

  const newTotal = verifyTx?.reduce((s, t) => s + (t.share_quantity || 0), 0) || 0;

  console.log(`\nUnits (G04104116) after fix: ${newTotal.toLocaleString()}`);
  console.log(`Doug's expected:              7,886,132`);
  console.log(`Match: ${newTotal === 7886132 ? '✅' : '❌ (diff: ' + (newTotal - 7886132).toLocaleString() + ')'}`);

  // Check all CUSIPs
  console.log("\n=== ALL CUSIPS AFTER FIX ===");

  const { data: allTx } = await supabase
    .from("transfers_new")
    .select("cusip, share_quantity")
    .eq("issuer_id", APEX_ID);

  const byCusip = {};
  allTx?.forEach(t => {
    const cusip = t.cusip || 'NO_CUSIP';
    if (!byCusip[cusip]) byCusip[cusip] = 0;
    byCusip[cusip] += (t.share_quantity || 0);
  });

  for (const [cusip, total] of Object.entries(byCusip)) {
    console.log(`${cusip}: ${total.toLocaleString()}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("FIX COMPLETE");
  console.log("=".repeat(80));
}

fix().catch(console.error);
