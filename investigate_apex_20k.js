// Investigate the 20,000 difference in APEX Units
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const APEX_ID = "adcd093a-2be4-448e-b467-bfb2e07d825c";

async function investigate() {
  console.log("=".repeat(80));
  console.log("INVESTIGATING 20,000 DIFFERENCE IN APEX UNITS");
  console.log("=".repeat(80));

  // Get all Units transactions
  const { data: unitsTx } = await supabase
    .from("transfers_new")
    .select("*")
    .eq("issuer_id", APEX_ID)
    .eq("cusip", "G04104116")
    .order("transaction_date");

  console.log(`\nTotal Units transactions: ${unitsTx?.length || 0}`);

  // Group by type and sum
  const byType = {};
  unitsTx?.forEach(t => {
    const type = t.transaction_type || 'UNKNOWN';
    if (!byType[type]) byType[type] = { count: 0, sum: 0, transactions: [] };
    byType[type].count++;
    byType[type].sum += (t.share_quantity || 0);
    byType[type].transactions.push(t);
  });

  console.log("\n=== BY TRANSACTION TYPE ===");
  for (const [type, data] of Object.entries(byType)) {
    console.log(`\n${type}: ${data.count} tx, sum: ${data.sum.toLocaleString()}`);
  }

  const total = unitsTx?.reduce((s, t) => s + (t.share_quantity || 0), 0) || 0;
  console.log(`\nTotal: ${total.toLocaleString()}`);
  console.log(`Doug expects: 7,886,132`);
  console.log(`Difference: ${(7886132 - total).toLocaleString()}`);

  // List all transactions
  console.log("\n=== ALL UNITS TRANSACTIONS ===");
  unitsTx?.forEach((t, i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${t.transaction_date} | ${t.transaction_type?.padEnd(18)} | ${t.share_quantity?.toLocaleString().padStart(15)} | ${t.notes?.substring(0, 30) || 'N/A'}`);
  });

  // Check for any transactions close to 20,000
  console.log("\n=== TRANSACTIONS NEAR 20,000 ===");
  unitsTx?.filter(t => {
    const qty = Math.abs(t.share_quantity || 0);
    return qty >= 15000 && qty <= 25000;
  }).forEach(t => {
    console.log(`${t.transaction_date} | ${t.transaction_type} | ${t.share_quantity?.toLocaleString()} | ${t.notes || 'N/A'}`);
  });

  // Check if there are any DWAC Deposits that might be wrong
  console.log("\n=== DWAC DEPOSITS ===");
  byType['DWAC Deposit']?.transactions.forEach(t => {
    console.log(`${t.transaction_date} | ${t.share_quantity?.toLocaleString()} | ${t.notes || 'N/A'}`);
  });
}

investigate().catch(console.error);
