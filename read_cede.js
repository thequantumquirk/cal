const XLSX = require("xlsx");
const workbook = XLSX.readFile("/Users/bala/Documents/efficiency/CRAC Books (as of 9.12.25).xlsx");

const sheet = workbook.Sheets["Recordkeeping Book"];
const data = XLSX.utils.sheet_to_json(sheet);

const cedeRecords = data.filter(row => {
  const name = (row["Shareholder/Entity Last Name"] || "").toString();
  return name.includes("Cede");
});

console.log("=== CEDE & CO. HOLDINGS ===\n");
console.log("Total transactions:", cedeRecords.length, "\n");

const bySecurityType = {};
cedeRecords.forEach(record => {
  const secType = record["Security Type"] || "Unknown";
  if (!bySecurityType[secType]) {
    bySecurityType[secType] = [];
  }
  bySecurityType[secType].push(record);
});

Object.keys(bySecurityType).forEach(secType => {
  console.log("Security Type:", secType);
  console.log("Transactions:", bySecurityType[secType].length);
  
  let totalHeld = 0;
  bySecurityType[secType].forEach(rec => {
    console.log("  - Transaction:", rec["Type of Transaction"]);
    console.log("    Credit/Debit:", rec["Credit/Debit"]);
    console.log("    Total Securities Held:", rec["Total Securities Held"]);
    console.log("    Date:", rec["Credit Date"]);
    console.log("    CUSIP:", rec["Issue CUSIP"]);
    
    if (rec["Total Securities Held"]) {
      totalHeld = rec["Total Securities Held"];
    }
    console.log("");
  });
  
  console.log("FINAL TOTAL FOR", secType + ":", totalHeld);
  console.log("=".repeat(50) + "\n");
});
