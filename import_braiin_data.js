
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";
const FILE_PATH = '/Users/bala/EZ/Braiin Cap Table (as of 11.25.25).xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Helpers ---
function excelDateToJSDate(serial) {
    if (!serial) return new Date();
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
}

async function main() {
    console.log("🚀 Starting Import Script for Braiin Limited...");

    // 1. Read Excel
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ File not found: ${FILE_PATH}`);
        return;
    }
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = 'Record Keeping Book';
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Loaded ${rawData.length} rows from '${sheetName}'`);

    // 2. Get or Create Issuer
    const issuerName = "Braiin Limited";
    let issuerId;

    const { data: existingIssuer, error: issuerError } = await supabase
        .from('issuers_new')
        .select('id')
        .eq('issuer_name', issuerName)
        .maybeSingle();

    if (existingIssuer) {
        issuerId = existingIssuer.id;
        console.log(`ℹ️ Issuer found: ${issuerName} (${issuerId})`);
    } else {
        console.log(`Mz Creating new issuer: ${issuerName}...`);
        const { data: newIssuer, error: createIssuerError } = await supabase
            .from('issuers_new')
            .insert({
                issuer_name: issuerName,
                address: "283 Rokeby Road",
                city: "Subiaco",
                state: "Western Australia",
                zip: "6008",
                country: "Australia",
                status: "active"
            })
            .select()
            .single();

        if (createIssuerError) {
            console.error("❌ Failed to create issuer:", createIssuerError);
            return;
        }
        issuerId = newIssuer.id;
        console.log(`✅ Created Issuer: ${issuerId}`);
    }

    // 3. Get or Create Security (Ordinary Shares)
    // Using placeholder CUSIP as discussed
    const CUSIP = "BRAIIN-ORD";
    const CLASS_NAME = "Ordinary Shares";
    let securityId;

    const { data: existingSecurity, error: securityError } = await supabase
        .from('securities_new')
        .select('id')
        .eq('issuer_id', issuerId)
        .eq('cusip', CUSIP)
        .maybeSingle();

    if (existingSecurity) {
        securityId = existingSecurity.id;
        console.log(`ℹ️ Security found: ${CLASS_NAME} (${securityId})`);
    } else {
        console.log(`Mz Creating new security: ${CLASS_NAME}...`);
        const { data: newSecurity, error: createSecurityError } = await supabase
            .from('securities_new')
            .insert({
                issuer_id: issuerId,
                class_name: CLASS_NAME,
                issue_name: CLASS_NAME,
                cusip: CUSIP,
                total_authorized_shares: 100000000, // Placeholder large number
                status: "active",
                created_by: "system_import"
            })
            .select()
            .single();

        if (createSecurityError) {
            console.error("❌ Failed to create security:", createSecurityError);
            return;
        }
        securityId = newSecurity.id;
        console.log(`✅ Created Security: ${securityId}`);
    }

    // 4. Process Shareholders & Transactions
    console.log("🔄 Processing Shareholders and Transactions...");

    let successCount = 0;
    let errorCount = 0;

    // Group by email to aggregate positions if needed, but here we process row by row for transactions
    // We need to maintain a map of email -> shareholder_id to avoid re-querying
    const emailToIdMap = new Map();

    for (const row of rawData) {
        try {
            const email = row['Email'] ? row['Email'].trim() : null;
            const firstName = row['First Name'];
            const lastName = row['Last Name'];

            if (!email) {
                console.warn("⚠️ Skipping row missing email:", row);
                continue;
            }

            // --- A. Upsert Shareholder ---
            let shareholderId = emailToIdMap.get(email);

            if (!shareholderId) {
                // Check DB
                const { data: existingSh } = await supabase
                    .from('shareholders_new')
                    .select('id')
                    .eq('issuer_id', issuerId)
                    .eq('email', email)
                    .maybeSingle();

                if (existingSh) {
                    shareholderId = existingSh.id;
                } else {
                    // Create
                    const { data: newSh, error: createShError } = await supabase
                        .from('shareholders_new')
                        .insert({
                            issuer_id: issuerId,
                            first_name: firstName,
                            last_name: lastName,
                            email: email,
                            holder_type: row['Holder Type'] || 'Individual',
                            address: row['Address'],
                            status: 'Active'
                        })
                        .select()
                        .single();

                    if (createShError) {
                        console.error(`❌ Failed to create shareholder ${email}:`, createShError.message);
                        errorCount++;
                        continue;
                    }
                    shareholderId = newSh.id;
                }
                emailToIdMap.set(email, shareholderId);
            }

            // --- B. Insert Transaction (Transfer) ---
            const shares = row['Shares'] || 0;
            const creditDateSerial = row['Credit Date'];
            const txDate = excelDateToJSDate(creditDateSerial);

            const { error: txError } = await supabase
                .from('transfers_new')
                .insert({
                    issuer_id: issuerId,
                    shareholder_id: shareholderId,
                    transaction_type: 'Issuance', // Initial load
                    share_quantity: shares,
                    transaction_date: txDate.toISOString(),
                    status: 'COMPLETED',
                    certificate_type: 'Book Entry',
                    cusip: CUSIP, // Link to security via CUSIP often used in transfers
                    notes: 'Imported from Excel'
                });

            if (txError) {
                console.error(`❌ Failed to insert transaction for ${email}:`, txError.message);
                errorCount++;
            }

            // --- C. Update/Insert Position ---
            // We need to fetch current position to add to it, or just upsert if we assume this is the only source
            // For safety, let's check if a position exists
            const { data: existingPos } = await supabase
                .from('shareholder_positions_new')
                .select('id, shares_owned')
                .eq('shareholder_id', shareholderId)
                .eq('security_id', securityId)
                .maybeSingle();

            let newBalance = shares;
            if (existingPos) {
                newBalance = existingPos.shares_owned + shares;
                // Update
                await supabase
                    .from('shareholder_positions_new')
                    .update({
                        shares_owned: newBalance,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingPos.id);
            } else {
                // Insert
                await supabase
                    .from('shareholder_positions_new')
                    .insert({
                        issuer_id: issuerId,
                        shareholder_id: shareholderId,
                        security_id: securityId,
                        shares_owned: newBalance,
                        position_date: new Date().toISOString(),
                        status: 'Active'
                    });
            }

            successCount++;
            process.stdout.write('.'); // Progress indicator

        } catch (err) {
            console.error(`\n❌ Error processing row:`, err);
            errorCount++;
        }
    }

    console.log(`\n\n✅ Import Complete!`);
    console.log(`Successful records: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

main();
