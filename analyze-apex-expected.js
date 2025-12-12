const XLSX = require('xlsx');

const wb = XLSX.readFile('/Users/bala/Downloads/APXT Books - (as of 11.04.25).xlsx');
const recordkeepingSheet = wb.Sheets[wb.SheetNames[1]];
const recordkeepingData = XLSX.utils.sheet_to_json(recordkeepingSheet, { header: 1 });

console.log('=== SUMMARY ROWS THAT SHOULD BE FILTERED ===\n');

let summaryRows = [];
recordkeepingData.forEach((row, i) => {
  if (i === 0) return;
  if (!row || row.length === 0) return;

  const securityType = String(row[4] || '').toLowerCase();
  const issuanceType = String(row[5] || '').toLowerCase();

  if (securityType.includes('total') || securityType.includes('outstanding') ||
      issuanceType.includes('total') || issuanceType.includes('outstanding')) {
    console.log(`Row ${i+1} (SHOULD BE FILTERED): SecurityType=[${row[4]}] IssuanceType=[${row[5]}]`);
    summaryRows.push(i+1);
  }
});

console.log('\nTotal summary rows found:', summaryRows.length);

console.log('\n=== EXPECTED COUNTS (After filtering summary rows) ===\n');

let counts = {
  units: { count: 0, total: 0 },
  classA: { count: 0, total: 0 },
  classB: { count: 0, total: 0 },
  warrants: { count: 0, total: 0 }
};

recordkeepingData.forEach((row, i) => {
  if (i === 0) return;
  if (!row || row.length === 0) return;

  const securityType = String(row[4] || '').toLowerCase();
  const qty = parseInt(String(row[9] || '0').replace(/[, ]/g, '')) || 0;

  // Skip summary rows
  if (securityType.includes('total') || securityType.includes('outstanding')) return;

  if (securityType.includes('unit')) {
    counts.units.count++;
    counts.units.total += qty;
  } else if (securityType.includes('class a')) {
    counts.classA.count++;
    counts.classA.total += qty;
  } else if (securityType.includes('class b')) {
    counts.classB.count++;
    counts.classB.total += qty;
  } else if (securityType.includes('warrant')) {
    counts.warrants.count++;
    counts.warrants.total += qty;
  }
});

console.log('Units:', counts.units.count, 'transactions, Total:', counts.units.total.toLocaleString());
console.log('Class A:', counts.classA.count, 'transactions, Total:', counts.classA.total.toLocaleString());
console.log('Class B:', counts.classB.count, 'transactions, Total:', counts.classB.total.toLocaleString());
console.log('Warrants:', counts.warrants.count, 'transactions, Total:', counts.warrants.total.toLocaleString());
