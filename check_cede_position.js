// Check Cede & Co Units position specifically
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const APEX_ID = "adcd093a-2be4-448e-b467-bfb2e07d825c";

async function check() {
  console.log("=".repeat(80));
  console.log("CEDE & CO UNITS POSITION - APEX");
  console.log("=".repeat(80));

  // Get Cede & Co shareholder
  const { data: cede } = await supabase
    .from("shareholders_new")
    .select("id, account_number, first_name, last_name")
    .eq("issuer_id", APEX_ID)
    .eq("account_number", "1")
    .single();

  console.log("\n=== CEDE & CO SHAREHOLDER ===");
  console.log("ID:", cede?.id);
  console.log("Account:", cede?.account_number);
  console.log("Name:", cede?.last_name);

  // Get all Units transactions for Cede & Co
  const { data: cedeTx } = await supabase
    .from("transfers_new")
    .select("transaction_type, share_quantity, transaction_date, notes")
    .eq("issuer_id", APEX_ID)
    .eq("cusip", "G04104116")
    .eq("shareholder_id", cede?.id)
    .order("transaction_date");

  console.log("\n=== CEDE & CO UNITS TRANSACTIONS ===");
  console.log("Count:", cedeTx?.length || 0);

  // List all transactions
  console.log("\nAll transactions:");
  cedeTx?.forEach((t, i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${t.transaction_date} | ${t.transaction_type?.padEnd(18)} | ${t.share_quantity?.toLocaleString().padStart(15)}`);
  });

  // Group by type
  const byType = {};
  cedeTx?.forEach(t => {
    const type = t.transaction_type || "UNKNOWN";
    if (!byType[type]) byType[type] = { count: 0, sum: 0 };
    byType[type].count++;
    byType[type].sum += (t.share_quantity || 0);
  });

  console.log("\nBy Type:");
  for (const [type, data] of Object.entries(byType)) {
    console.log(`  ${type}: ${data.count} tx, sum: ${data.sum.toLocaleString()}`);
  }

  const cedeTotal = cedeTx?.reduce((s, t) => s + (t.share_quantity || 0), 0) || 0;
  console.log("\n" + "=".repeat(60));
  console.log("CEDE & CO UNITS POSITION");
  console.log("=".repeat(60));
  console.log(`Calculated:    ${cedeTotal.toLocaleString()}`);
  console.log(`Doug expects:  7,886,132`);
  console.log(`Difference:    ${(cedeTotal - 7886132).toLocaleString()}`);
  console.log(`Match:         ${cedeTotal === 7886132 ? '✅ CORRECT!' : '❌ MISMATCH'}`);

  // Now get ALL shareholders' Units positions
  console.log("\n=== ALL SHAREHOLDERS UNITS POSITIONS ===");

  const { data: allShareholders } = await supabase
    .from("shareholders_new")
    .select("id, account_number, last_name")
    .eq("issuer_id", APEX_ID);

  let grandTotal = 0;
  for (const sh of allShareholders || []) {
    const { data: shTx } = await supabase
      .from("transfers_new")
      .select("share_quantity")
      .eq("issuer_id", APEX_ID)
      .eq("cusip", "G04104116")
      .eq("shareholder_id", sh.id);

    const total = shTx?.reduce((s, t) => s + (t.share_quantity || 0), 0) || 0;
    grandTotal += total;
    if (total !== 0 || (shTx?.length || 0) > 0) {
      console.log(`Account ${sh.account_number} (${sh.last_name}): ${total.toLocaleString()} (${shTx?.length || 0} tx)`);
    }
  }

  console.log("\n=== GRAND TOTAL (all shareholders) ===");
  console.log(`Total Units Outstanding: ${grandTotal.toLocaleString()}`);
}

check().catch(console.error);
