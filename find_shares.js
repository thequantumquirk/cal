
const XLSX = require('xlsx');

function findShares() {
    const workbook = XLSX.readFile('/Users/bala/EZ/Braiin Cap Table (as of 11.25.25).xlsx');
    const sheetName = 'Record Keeping Book';
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const targetName = "Abhinay Sai Modipalli";

    // The name might be split into First Name and Last Name columns.
    // Let's check the data structure first or try to match combined.

    let totalShares = 0;
    let foundRecords = [];

    data.forEach(row => {
        const firstName = row['First Name'] || '';
        const lastName = row['Last Name'] || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Check for exact match or if the name is in one of the columns
        if (fullName.toLowerCase() === targetName.toLowerCase() ||
            firstName.toLowerCase() === targetName.toLowerCase() ||
            lastName.toLowerCase() === targetName.toLowerCase()) {

            const shares = row['Shares'] || 0;
            totalShares += Number(shares);
            foundRecords.push({
                firstName,
                lastName,
                shares,
                type: row['Security Type']
            });
        }
    });

    console.log(`Found ${foundRecords.length} records for "${targetName}":`);
    foundRecords.forEach(r => console.log(` - ${r.firstName} ${r.lastName}: ${r.shares} (${r.type})`));
    console.log(`Total Shares: ${totalShares}`);
}

findShares();
