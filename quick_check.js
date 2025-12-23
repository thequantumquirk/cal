const XLSX = require('xlsx');

const files = [
    { path: '/Users/bala/EZ/CRAC Books (as of 9.12.25).xlsx', name: 'CRAC (WORKING)' },
    { path: '/Users/bala/EZ/DAAQ Books (as of 9.12.25).xlsx', name: 'DAAQ (WORKING)' },
    { path: '/Users/bala/EZ/RAAC Books (as of 9.12.25).xlsx', name: 'RAAC (WORKING)' },
    { path: '/Users/bala/EZ/APXT Books - (as of 12.02.25).xlsx', name: 'APEX (BROKEN)' },
    { path: '/Users/bala/EZ/LKSP Books - (as of 12.02.25).xlsx', name: 'LKSP (BROKEN)' }
];

console.log('Analyzing Excel files...\n');

files.forEach(({ path, name }) => {
    const workbook = XLSX.readFile(path);
    const rkSheet = workbook.Sheets['Recordkeeping Book'];
    const rkData = XLSX.utils.sheet_to_json(rkSheet, { header: 1 });

    const headers = rkData[0];
    const cusipIdx = headers.findIndex(h => String(h).toLowerCase().includes('cusip'));
    const txTypeIdx = headers.findIndex(h => String(h).toLowerCase().includes('type of transaction'));

    let txCount = 0;
    rkData.slice(1).forEach(row => {
        if (row[cusipIdx] && String(row[cusipIdx]).startsWith('G') && row[txTypeIdx]) {
            txCount++;
        }
    });

    console.log(`${name}: ${txCount} transactions in Recordkeeping Book`);
});
