// Investigate Production Database - Current State
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function investigate() {
  console.log("=".repeat(80));
  console.log("PRODUCTION DATABASE INVESTIGATION");
  console.log("=".repeat(80));

  // 1. List all issuers
  console.log("\n=== ALL ISSUERS ===");
  const { data: issuers, error: issuerError } = await supabase
    .from("issuers_new")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false });

  if (issuerError) {
    console.error("Error fetching issuers:", issuerError);
    return;
  }

  console.log(`Total issuers: ${issuers?.length || 0}`);
  issuers?.forEach((i, idx) => {
    console.log(`${idx + 1}. ${i.name} (${i.status || 'N/A'}) - ID: ${i.id}`);
  });

  // 2. For each issuer, get transaction counts and position summaries
  console.log("\n=== ISSUER DETAILS ===");

  for (const issuer of issuers || []) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`ISSUER: ${issuer.name}`);
    console.log(`ID: ${issuer.id}`);
    console.log(`${"─".repeat(60)}`);

    // Get securities
    const { data: securities } = await supabase
      .from("securities_new")
      .select("id, cusip, security_type, name")
      .eq("issuer_id", issuer.id);

    console.log(`\nSecurities: ${securities?.length || 0}`);
    securities?.forEach(s => {
      console.log(`  - ${s.cusip || 'NO CUSIP'} | ${s.security_type} | ${s.name || 'N/A'}`);
    });

    // Get shareholders
    const { data: shareholders } = await supabase
      .from("shareholders_new")
      .select("id, account_number, first_name, last_name")
      .eq("issuer_id", issuer.id);

    console.log(`\nShareholders: ${shareholders?.length || 0}`);

    // Get transactions
    const { data: transactions } = await supabase
      .from("transfers_new")
      .select("id, cusip, transaction_type, share_quantity, transaction_date, shareholder_id")
      .eq("issuer_id", issuer.id);

    console.log(`\nTransactions: ${transactions?.length || 0}`);

    // Calculate positions by CUSIP
    const positionsByCusip = {};
    transactions?.forEach(t => {
      const cusip = t.cusip || 'NO_CUSIP';
      if (!positionsByCusip[cusip]) {
        positionsByCusip[cusip] = { count: 0, sum: 0, types: {} };
      }
      positionsByCusip[cusip].count++;
      positionsByCusip[cusip].sum += (t.share_quantity || 0);

      const txType = t.transaction_type || 'UNKNOWN';
      if (!positionsByCusip[cusip].types[txType]) {
        positionsByCusip[cusip].types[txType] = { count: 0, sum: 0 };
      }
      positionsByCusip[cusip].types[txType].count++;
      positionsByCusip[cusip].types[txType].sum += (t.share_quantity || 0);
    });

    console.log(`\nPositions by CUSIP (calculated from transactions):`);
    for (const [cusip, data] of Object.entries(positionsByCusip)) {
      console.log(`\n  ${cusip}:`);
      console.log(`    Total: ${data.count} tx, Outstanding: ${data.sum.toLocaleString()}`);
      console.log(`    By Type:`);
      for (const [type, typeData] of Object.entries(data.types)) {
        console.log(`      ${type}: ${typeData.count} tx, sum: ${typeData.sum.toLocaleString()}`);
      }
    }

    // Get stored positions
    const { data: positions } = await supabase
      .from("positions_new")
      .select("id, cusip, total_shares, shareholder_id")
      .eq("issuer_id", issuer.id);

    console.log(`\nStored Positions: ${positions?.length || 0}`);

    // Sum stored positions by CUSIP
    const storedByCusip = {};
    positions?.forEach(p => {
      const cusip = p.cusip || 'NO_CUSIP';
      if (!storedByCusip[cusip]) storedByCusip[cusip] = 0;
      storedByCusip[cusip] += (p.total_shares || 0);
    });

    console.log(`\nStored Position Totals by CUSIP:`);
    for (const [cusip, total] of Object.entries(storedByCusip)) {
      const calculated = positionsByCusip[cusip]?.sum || 0;
      const match = total === calculated ? '✅' : '❌ MISMATCH';
      console.log(`  ${cusip}: ${total.toLocaleString()} ${match}`);
      if (total !== calculated) {
        console.log(`    Calculated: ${calculated.toLocaleString()}`);
        console.log(`    Difference: ${(total - calculated).toLocaleString()}`);
      }
    }

    // Check for transactions without shareholder_id
    const noShareholder = transactions?.filter(t => !t.shareholder_id) || [];
    if (noShareholder.length > 0) {
      console.log(`\n⚠️ Transactions without shareholder_id: ${noShareholder.length}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("INVESTIGATION COMPLETE");
  console.log("=".repeat(80));
}

investigate().catch(console.error);
