// Investigate Production Database - Current State (v2 - check schema first)
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function investigate() {
  console.log("=".repeat(80));
  console.log("PRODUCTION DATABASE INVESTIGATION");
  console.log("=".repeat(80));

  // 1. Get all issuers with * to see what columns exist
  console.log("\n=== FETCHING ALL ISSUERS ===");
  const { data: issuers, error: issuerError } = await supabase
    .from("issuers_new")
    .select("*")
    .order("created_at", { ascending: false });

  if (issuerError) {
    console.error("Error fetching issuers:", issuerError);
    return;
  }

  console.log(`Total issuers: ${issuers?.length || 0}`);

  if (issuers?.length > 0) {
    console.log("\nIssuer columns:", Object.keys(issuers[0]).join(", "));
  }

  issuers?.forEach((i, idx) => {
    // Try different column names for issuer name
    const issuerName = i.name || i.issuer_name || i.legal_name || i.company_name || 'UNKNOWN';
    console.log(`\n${idx + 1}. ${issuerName}`);
    console.log(`   ID: ${i.id}`);
    console.log(`   Status: ${i.status || 'N/A'}`);
  });

  // 2. For each issuer, investigate in detail
  for (const issuer of issuers || []) {
    const issuerName = issuer.name || issuer.issuer_name || issuer.legal_name || issuer.company_name || 'UNKNOWN';

    console.log(`\n${"=".repeat(70)}`);
    console.log(`ISSUER: ${issuerName}`);
    console.log(`ID: ${issuer.id}`);
    console.log(`${"=".repeat(70)}`);

    // Get securities
    const { data: securities, error: secError } = await supabase
      .from("securities_new")
      .select("*")
      .eq("issuer_id", issuer.id);

    if (secError) {
      console.log(`Securities error: ${secError.message}`);
    } else {
      console.log(`\nSecurities: ${securities?.length || 0}`);
      securities?.forEach(s => {
        console.log(`  - CUSIP: ${s.cusip || 'N/A'} | Type: ${s.security_type || s.type || 'N/A'} | Name: ${s.name || s.security_name || 'N/A'}`);
      });
    }

    // Get shareholders
    const { data: shareholders, error: shError } = await supabase
      .from("shareholders_new")
      .select("*")
      .eq("issuer_id", issuer.id);

    if (shError) {
      console.log(`Shareholders error: ${shError.message}`);
    } else {
      console.log(`\nShareholders: ${shareholders?.length || 0}`);
      shareholders?.slice(0, 5).forEach(s => {
        const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || 'N/A';
        console.log(`  - Account: ${s.account_number || 'N/A'} | Name: ${name}`);
      });
      if ((shareholders?.length || 0) > 5) {
        console.log(`  ... and ${shareholders.length - 5} more`);
      }
    }

    // Get transactions
    const { data: transactions, error: txError } = await supabase
      .from("transfers_new")
      .select("*")
      .eq("issuer_id", issuer.id);

    if (txError) {
      console.log(`Transactions error: ${txError.message}`);
    } else {
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

      console.log(`\nCalculated Positions by CUSIP:`);
      for (const [cusip, data] of Object.entries(positionsByCusip)) {
        console.log(`\n  ${cusip}:`);
        console.log(`    Total: ${data.count} tx | Outstanding: ${data.sum.toLocaleString()}`);
        for (const [type, typeData] of Object.entries(data.types)) {
          console.log(`      ${type}: ${typeData.count} tx, sum: ${typeData.sum.toLocaleString()}`);
        }
      }

      // Check transactions without shareholder_id
      const noShareholder = transactions?.filter(t => !t.shareholder_id) || [];
      if (noShareholder.length > 0) {
        console.log(`\n⚠️ Transactions WITHOUT shareholder_id: ${noShareholder.length}`);
      }
    }

    // Get stored positions
    const { data: positions, error: posError } = await supabase
      .from("positions_new")
      .select("*")
      .eq("issuer_id", issuer.id);

    if (posError) {
      console.log(`Positions error: ${posError.message}`);
    } else {
      console.log(`\nStored Positions: ${positions?.length || 0}`);

      // Sum stored positions by CUSIP
      const storedByCusip = {};
      positions?.forEach(p => {
        const cusip = p.cusip || 'NO_CUSIP';
        if (!storedByCusip[cusip]) storedByCusip[cusip] = 0;
        storedByCusip[cusip] += (p.total_shares || 0);
      });

      if (Object.keys(storedByCusip).length > 0) {
        console.log(`\nStored Position Totals vs Calculated:`);
        for (const [cusip, stored] of Object.entries(storedByCusip)) {
          // Get calculated from transactions
          const { data: txForCusip } = await supabase
            .from("transfers_new")
            .select("share_quantity")
            .eq("issuer_id", issuer.id)
            .eq("cusip", cusip);

          const calculated = txForCusip?.reduce((sum, t) => sum + (t.share_quantity || 0), 0) || 0;
          const match = stored === calculated ? '✅' : '❌ MISMATCH';

          console.log(`\n  ${cusip}:`);
          console.log(`    Stored:     ${stored.toLocaleString()}`);
          console.log(`    Calculated: ${calculated.toLocaleString()}`);
          console.log(`    Status:     ${match}`);
          if (stored !== calculated) {
            console.log(`    Difference: ${(stored - calculated).toLocaleString()}`);
          }
        }
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("INVESTIGATION COMPLETE");
  console.log("=".repeat(80));
}

investigate().catch(console.error);
