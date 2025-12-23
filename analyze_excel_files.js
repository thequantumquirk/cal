const XLSX = require('xlsx');

console.log('🔍 COMPREHENSIVE EXCEL FILE ANALYSIS');
console.log('='.repeat(80));
console.log('Goal: Find ALL discrepancies between Excel and Database import');
console.log('='.repeat(80));

// Analyze both files
const files = [
    { path: '/Users/bala/EZ/APXT Books - (as of 12.02.25).xlsx', name: 'APEX' },
    { path: '/Users/bala/EZ/LKSP Books - (as of 12.02.25).xlsx', name: 'Lake Superior' }
];

files.forEach(({ path, name }) => {
    console.log('\n\n' + '#'.repeat(80));
    console.log(`📊 ANALYZING: ${name}`);
    console.log('#'.repeat(80) + '\n');

    const workbook = XLSX.readFile(path);

    console.log(`Sheet Names: ${workbook.SheetNames.join(', ')}\n`);

    // Analyze each sheet
    workbook.SheetNames.forEach(sheetName => {
        console.log('\n' + '='.repeat(80));
        console.log(`📋 SHEET: ${sheetName}`);
        console.log('='.repeat(80));

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (data.length === 0) {
            console.log('⚠️  Empty sheet');
            return;
        }

        const headers = data[0];
        console.log(`\nHeaders (${headers.length} columns):`);
        headers.forEach((h, idx) => {
            if (h) console.log(`  [${idx}] ${h}`);
        });

        console.log(`\nTotal Rows: ${data.length - 1}`);

        // Count non-empty rows
        const nonEmptyRows = data.slice(1).filter(row =>
            row && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
        );
        console.log(`Non-empty Rows: ${nonEmptyRows.length}`);

        // Specific analysis for Control Book
        if (/control book/i.test(sheetName)) {
            console.log(`\n🔍 CONTROL BOOK SPECIFIC ANALYSIS:`);

            // Find column indices
            const headerLower = headers.map(h => String(h || '').toLowerCase());
            const cusipIdx = headerLower.findIndex(h => h.includes('cusip'));
            const secTypeIdx = headerLower.findIndex(h => h.includes('security type'));
            const txDateIdx = headerLower.findIndex(h => h.includes('transaction date') || h === 'date');
            const issuedQtyIdx = headerLower.findIndex(h => h.includes('issued security'));
            const txTypeIdx = headerLower.findIndex(h => h.includes('type of issuance') || h.includes('issuance type'));
            const outstandingIdx = headerLower.findIndex(h => h.includes('total outstanding'));

            console.log(`\nColumn Indices:`);
            console.log(`  CUSIP: ${cusipIdx}`);
            console.log(`  Security Type: ${secTypeIdx}`);
            console.log(`  Transaction Date: ${txDateIdx}`);
            console.log(`  Issued Security: ${issuedQtyIdx}`);
            console.log(`  Type of Issuance: ${txTypeIdx}`);
            console.log(`  Total Outstanding: ${outstandingIdx}`);

            // Count transactions per security
            const securities = {};
            let currentCUSIP = null;
            let currentSecType = null;

            data.slice(1).forEach((row, idx) => {
                const cusip = cusipIdx >= 0 ? row[cusipIdx] : null;
                const secType = secTypeIdx >= 0 ? row[secTypeIdx] : null;

                // New security header
                if (cusip && secType && String(cusip).startsWith('G')) {
                    currentCUSIP = cusip;
                    currentSecType = secType;
                    securities[cusip] = {
                        name: secType,
                        transactions: []
                    };
                }

                // Transaction row
                if (currentCUSIP && txDateIdx >= 0 && issuedQtyIdx >= 0) {
                    const txDate = row[txDateIdx];
                    const qty = row[issuedQtyIdx];
                    const txType = txTypeIdx >= 0 ? row[txTypeIdx] : null;
                    const outstanding = outstandingIdx >= 0 ? row[outstandingIdx] : null;

                    if (txDate && qty && txType) {
                        securities[currentCUSIP].transactions.push({
                            rowNum: idx + 2,
                            date: txDate,
                            type: txType,
                            quantity: qty,
                            outstanding: outstanding
                        });
                    }
                }
            });

            console.log(`\n📊 CONTROL BOOK Transactions by Security:`);
            Object.entries(securities).forEach(([cusip, data]) => {
                console.log(`\n  ${data.name} (${cusip}): ${data.transactions.length} transactions`);
                if (data.transactions.length > 0) {
                    const lastTx = data.transactions[data.transactions.length - 1];
                    const lastOut = typeof lastTx.outstanding === 'number' ? lastTx.outstanding.toLocaleString() : lastTx.outstanding;
                    console.log(`  ✅ FINAL OUTSTANDING: ${lastOut}`);
                }
            });
        }

        // Specific analysis for Recordkeeping Book
        if (/recordkeeping book/i.test(sheetName)) {
            console.log(`\n🔍 RECORDKEEPING BOOK SPECIFIC ANALYSIS:`);

            const headerLower = headers.map(h => String(h || '').toLowerCase());
            const cusipIdx = headerLower.findIndex(h => h.includes('cusip'));
            const txTypeIdx = headerLower.findIndex(h => h.includes('type of transaction') || h.includes('transaction type'));
            const qtyIdx = headerLower.findIndex(h => h.includes('total securities issued') || h.includes('quantity'));

            // Count transactions by CUSIP
            const txByCUSIP = {};

            data.slice(1).forEach(row => {
                const cusip = cusipIdx >= 0 ? row[cusipIdx] : null;
                const txType = txTypeIdx >= 0 ? row[txTypeIdx] : null;
                const qty = qtyIdx >= 0 ? row[qtyIdx] : null;

                if (cusip && txType && qty && String(cusip).startsWith('G')) {
                    if (!txByCUSIP[cusip]) {
                        txByCUSIP[cusip] = 0;
                    }
                    txByCUSIP[cusip]++;
                }
            });

            console.log(`\n📊 RECORDKEEPING BOOK Transactions by CUSIP:`);
            Object.entries(txByCUSIP).forEach(([cusip, count]) => {
                console.log(`  ${cusip}: ${count} transactions`);
            });
        }
    });
});

console.log('\n\n' + '#'.repeat(80));
console.log('✅ Analysis Complete');
console.log('#'.repeat(80) + '\n');
