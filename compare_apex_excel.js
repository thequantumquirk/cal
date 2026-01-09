// Compare APEX production data with Excel file
const XLSX = require('xlsx');
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://rckatnrirtoyqsgechol.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2F0bnJpcnRveXFzZ2VjaG9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0MTgzMSwiZXhwIjoyMDcxNDE3ODMxfQ.7FN0XzUaMUrgn21mbZtWnMyi_B0AKF4sTct8q6Jx7Xg";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const APEX_ID = "adcd093a-2be4-448e-b467-bfb2e07d825c";

async function compare() {
  console.log("=".repeat(80));
  console.log("APEX - EXCEL vs DATABASE COMPARISON");
  console.log("=".repeat(80));

  // Read Excel file
  const workbook = XLSX.readFile('/Users/bala/Downloads/APXT Books - (as of 12.30.25).xlsx');
  console.log("\nExcel Sheets:", workbook.SheetNames.join(", "));

  // Check Recordkeeping Book for expected totals
  const recordBook = workbook.Sheets['Recordkeeping Book'];
  if (recordBook) {
    const recordData = XLSX.utils.sheet_to_json(recordBook, { header: 1 });
    console.log(`\nRecordkeeping Book: ${recordData.length} rows`);

    // Find header row and understand structure
    const headerRow = recordData.find(row =>
      row.some(cell => String(cell).toLowerCase().includes('cusip') ||
                       String(cell).toLowerCase().includes('transaction'))
    );
    if (headerRow) {
      console.log("Header:", headerRow.slice(0, 15).join(" | "));
    }

    // Analyze transactions by CUSIP
    const cusipTotals = {};
    let lastCusip = null;

    recordData.slice(1).forEach((row, i) => {
      const cusip = row[3] || lastCusip;  // Column D is usually CUSIP
      if (cusip) lastCusip = cusip;

      const txType = row[5];  // Transaction type
      const qty = row[9];     // Quantity

      if (txType && qty !== undefined && qty !== null && qty !== '') {
        if (!cusipTotals[cusip]) {
          cusipTotals[cusip] = { count: 0, sum: 0, types: {} };
        }
        cusipTotals[cusip].count++;
        cusipTotals[cusip].sum += Number(qty) || 0;

        if (!cusipTotals[cusip].types[txType]) {
          cusipTotals[cusip].types[txType] = { count: 0, sum: 0 };
        }
        cusipTotals[cusip].types[txType].count++;
        cusipTotals[cusip].types[txType].sum += Number(qty) || 0;
      }
    });

    console.log("\n=== EXCEL TOTALS BY CUSIP ===");
    for (const [cusip, data] of Object.entries(cusipTotals)) {
      console.log(`\n${cusip}:`);
      console.log(`  Total: ${data.count} tx, Outstanding: ${data.sum.toLocaleString()}`);
      for (const [type, typeData] of Object.entries(data.types)) {
        console.log(`    ${type}: ${typeData.count} tx, sum: ${typeData.sum.toLocaleString()}`);
      }
    }
  }

  // Get DB data for comparison
  console.log("\n=== DATABASE TOTALS BY CUSIP ===");

  const { data: dbTx } = await supabase
    .from("transfers_new")
    .select("cusip, transaction_type, share_quantity")
    .eq("issuer_id", APEX_ID);

  const dbTotals = {};
  dbTx?.forEach(t => {
    const cusip = t.cusip || 'NO_CUSIP';
    if (!dbTotals[cusip]) {
      dbTotals[cusip] = { count: 0, sum: 0, types: {} };
    }
    dbTotals[cusip].count++;
    dbTotals[cusip].sum += (t.share_quantity || 0);

    const txType = t.transaction_type || 'UNKNOWN';
    if (!dbTotals[cusip].types[txType]) {
      dbTotals[cusip].types[txType] = { count: 0, sum: 0 };
    }
    dbTotals[cusip].types[txType].count++;
    dbTotals[cusip].types[txType].sum += (t.share_quantity || 0);
  });

  for (const [cusip, data] of Object.entries(dbTotals)) {
    console.log(`\n${cusip}:`);
    console.log(`  Total: ${data.count} tx, Outstanding: ${data.sum.toLocaleString()}`);
    for (const [type, typeData] of Object.entries(data.types)) {
      console.log(`    ${type}: ${typeData.count} tx, sum: ${typeData.sum.toLocaleString()}`);
    }
  }

  // Look specifically at DWAC Withdrawal transactions in both
  console.log("\n=== DWAC WITHDRAWAL ANALYSIS ===");

  // Excel DWAC Withdrawals
  if (recordBook) {
    const recordData = XLSX.utils.sheet_to_json(recordBook, { header: 1 });
    console.log("\nExcel DWAC Withdrawals (first 10):");
    let count = 0;
    let lastCusip = null;
    recordData.slice(1).forEach((row, i) => {
      const cusip = row[3] || lastCusip;
      if (row[3]) lastCusip = row[3];
      const txType = row[5];
      const qty = row[9];

      if (txType === 'DWAC Withdrawal' && count < 10) {
        console.log(`  Row ${i+2}: CUSIP=${cusip} | qty=${qty}`);
        count++;
      }
    });
  }

  // DB DWAC Withdrawals for Units
  const { data: dbDwacWd } = await supabase
    .from("transfers_new")
    .select("cusip, share_quantity, transaction_date, notes")
    .eq("issuer_id", APEX_ID)
    .eq("transaction_type", "DWAC Withdrawal")
    .order("transaction_date");

  console.log(`\nDB DWAC Withdrawals (${dbDwacWd?.length || 0} total):`);
  dbDwacWd?.forEach((t, i) => {
    console.log(`  ${t.transaction_date} | ${t.cusip} | qty: ${t.share_quantity?.toLocaleString().padStart(12)} | ${t.notes?.substring(0, 30) || 'N/A'}`);
  });

  // Summary of the issue
  console.log("\n" + "=".repeat(80));
  console.log("ISSUE SUMMARY");
  console.log("=".repeat(80));

  const unitsDb = dbTotals['G04104116'];
  console.log(`\nUnits (G04104116) in DB: ${unitsDb?.sum?.toLocaleString() || 0}`);
  console.log(`Doug's Expected:         7,886,132`);

  const dwacWdSum = unitsDb?.types['DWAC Withdrawal']?.sum || 0;
  console.log(`\nDWAC Withdrawal sum in DB: ${dwacWdSum.toLocaleString()}`);
  console.log(`  → Should be NEGATIVE (shares leaving custody)`);
  console.log(`  → Currently: ${dwacWdSum > 0 ? 'POSITIVE ❌' : 'NEGATIVE ✅'}`);

  if (dwacWdSum > 0) {
    const correctedTotal = unitsDb.sum - (2 * dwacWdSum);
    console.log(`\nIf DWAC Withdrawals were negative:`);
    console.log(`  Corrected total: ${correctedTotal.toLocaleString()}`);
  }
}

compare().catch(console.error);
