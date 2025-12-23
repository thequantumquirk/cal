const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/bala/EZ/APXT Books - (as of 12.02.25).xlsx');

console.log('🔍 Comparing Recordkeeping Book data for all securities');
console.log('='.repeat(80));

const rkSheet = workbook.Sheets['Recordkeeping Book'];
const data = XLSX.utils.sheet_to_json(rkSheet, { header: 1, defval: '' });

const headers = data[0];
const headerLower = headers.map(h => String(h || '').toLowerCase());

const cusipIdx = headerLower.findIndex(h => h.includes('cusip'));
const txTypeIdx = headerLower.findIndex(h => h.includes('type of transaction'));
const qtyIdx = headerLower.findIndex(h => h.includes('total securities issued'));
const secTypeIdx = headerLower.findIndex(h => h.includes('security type'));

console.log('\nAnalyzing transactions by CUSIP in Recordkeeping Book:\n');

const byCUSIP = {};

data.slice(1).forEach((row, idx) => {
    const cusip = cusipIdx >= 0 ? row[cusipIdx] : null;
    const txType = txTypeIdx >= 0 ? row[txTypeIdx] : null;
    const qty = qtyIdx >= 0 ? row[qtyIdx] : null;
    const secType = secTypeIdx >= 0 ? row[secTypeIdx] : null;

    if (cusip && String(cusip).startsWith('G')) {
        if (!byCUSIP[cusip]) {
            byCUSIP[cusip] = {
                securityType: secType || 'Unknown',
                transactions: []
            };
        }

        if (txType && qty) {
            byCUSIP[cusip].transactions.push({
                rowNum: idx + 2,
                type: txType,
                qty: qty
            });
        }
    }
});

Object.entries(byCUSIP).forEach(([cusip, data]) => {
    console.log(`${data.securityType} (${cusip}): ${data.transactions.length} transactions`);
    data.transactions.forEach((tx, idx) => {
        const qty = typeof tx.qty === 'number' ? tx.qty.toLocaleString() : tx.qty;
        console.log(`  ${idx + 1}. Row ${tx.rowNum}: ${tx.type} | Qty: ${qty}`);
    });
    console.log();
});

console.log('\n' + '='.repeat(80));
console.log('Now checking Control Book for comparison...');
console.log('='.repeat(80));

const cbSheet = workbook.Sheets['Control Book'];
const cbData = XLSX.utils.sheet_to_json(cbSheet, { header: 1, defval: '' });

const cbHeaders = cbData[0];
const cbHeaderLower = cbHeaders.map(h => String(h || '').toLowerCase());

const cbCusipIdx = cbHeaderLower.findIndex(h => h.includes('cusip'));
const cbSecTypeIdx = cbHeaderLower.findIndex(h => h.includes('security type'));
const cbTxTypeIdx = cbHeaderLower.findIndex(h => h.includes('type of issuance'));
const cbQtyIdx = cbHeaderLower.findIndex(h => h.includes('issued security'));

const cbByCUSIP = {};
let currentCUSIP = null;
let currentSecType = null;

cbData.slice(1).forEach((row, idx) => {
    const cusip = cbCusipIdx >= 0 ? row[cbCusipIdx] : null;
    const secType = cbSecTypeIdx >= 0 ? row[cbSecTypeIdx] : null;

    if (cusip && secType && String(cusip).startsWith('G')) {
        currentCUSIP = cusip;
        currentSecType = secType;
        cbByCUSIP[cusip] = {
            securityType: secType,
            transactions: []
        };
    }

    if (currentCUSIP && row[cbTxTypeIdx] && row[cbQtyIdx]) {
        cbByCUSIP[currentCUSIP].transactions.push({
            type: row[cbTxTypeIdx],
            qty: row[cbQtyIdx]
        });
    }
});

console.log('\nControl Book transactions:\n');
Object.entries(cbByCUSIP).forEach(([cusip, data]) => {
    console.log(`${data.securityType} (${cusip}): ${data.transactions.length} transactions`);
    console.log(`  Last transaction: ${data.transactions[data.transactions.length - 1].type}`);
    console.log();
});

console.log('='.repeat(80));
console.log('SUMMARY: Why Units and Warrants worked but Class A did not');
console.log('='.repeat(80));
