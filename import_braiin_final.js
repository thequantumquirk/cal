
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rpnrtswahzutdgotkzkz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ0c3dhaHp1dGRnb3Rremt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA2NjY5MiwiZXhwIjoyMDcwNjQyNjkyfQ.zkCzd9XgLmz4BFs8Ocx8XrLsR2o-YRWfaX5wCrbfwU4";
const FILE_PATH = '/Users/bala/EZ/Braiin Cap Table (as of 12.5.25).xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Default Date for missing dates (based on file context)
const DEFAULT_DATE = new Date("2025-11-10");

// --- Helpers ---
function excelDateToJSDate(serial) {
    if (!serial) return DEFAULT_DATE;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
}

async function nukeIssuerStructure(issuerId) {
    console.log(`☢️  Nuking issuer data for ID: ${issuerId}...`);

    // 0. Delete Restriction Templates (dependencies first)
    // Note: transfers_new reference these, but we delete transfers first usually? 
    // Actually transfers_new.restriction_id references templates. So we delete transfers first.

    // 1. Delete Transfers
    const { error: err1 } = await supabase.from('transfers_new').delete().eq('issuer_id', issuerId);
    if (err1) console.error("Error deleting transfers:", err1);

    // 2. Delete Shareholder Positions
    const { error: err2 } = await supabase.from('shareholder_positions_new').delete().eq('issuer_id', issuerId);
    if (err2) console.error("Error deleting positions:", err2);

    // 3. Delete Shareholders
    const { error: err3 } = await supabase.from('shareholders_new').delete().eq('issuer_id', issuerId);
    if (err3) console.error("Error deleting shareholders:", err3);

    // 4. Delete Securities
    const { error: err4 } = await supabase.from('securities_new').delete().eq('issuer_id', issuerId);
    if (err4) console.error("Error deleting securities:", err4);

    // 5. Delete Restriction Templates
    const { error: errT } = await supabase.from('restrictions_templates_new').delete().eq('issuer_id', issuerId);
    if (errT) console.error("Error deleting templates:", errT);

    // 6. Delete Issuer
    const { error: err5 } = await supabase.from('issuers_new').delete().eq('id', issuerId);
    if (err5) console.error("Error deleting issuer:", err5);

    console.log("✅ Nuke complete.");
}

async function main() {
    console.log("🚀 Starting Import Script v3 for Braiin Limited (12.5.25)...");

    const issuerName = "Braiin Limited";
    let issuerId;

    // 1. Check for existing issuer by name to NUKE
    console.log(`🔍 Checking for existing issuer: "${issuerName}"...`);
    const { data: existingIssuer, error: findError } = await supabase
        .from('issuers_new')
        .select('id')
        .eq('issuer_name', issuerName)
        .maybeSingle();

    if (findError) {
        console.error("❌ Error searching for issuer:", findError);
        return;
    }

    // 1.5 Get Admin User for 'created_by' fields
    let systemUserId = null;
    const { data: userData } = await supabase.from('user_profiles').select('id').limit(1).maybeSingle();
    if (userData) {
        systemUserId = userData.id;
        console.log(`👤 Using system user: ${systemUserId}`);
    } else {
        // Fallback: try querying users view or just warning
        console.warn("⚠️ Could not find a system user. 'created_by' fields might fail if required.");
    }

    if (existingIssuer) {
        console.log(`⚠️  Found existing issuer "${issuerName}" (ID: ${existingIssuer.id}). Nuking data...`);
        await nukeIssuerStructure(existingIssuer.id);
        // We deleted the issuer row itself in nukeIssuerStructure, so we will recreate it below.
    } else {
        console.log("ℹ️  No existing issuer found. Proceeding to create.");
    }

    // 2. Read Excel
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ File not found: ${FILE_PATH}`);
        return;
    }
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = 'Record Keeping Book';
    const worksheet = workbook.Sheets[sheetName];
    // Use raw: false to get formatted strings? No, raw values are better for calc.
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Loaded ${rawData.length} rows from '${sheetName}'`);

    // 3. Create Issuer
    // We assume it's gone or never existed.
    console.log(`Mz Creating new issuer: ${issuerName}...`);
    const { data: newIssuer, error: createIssuerError } = await supabase
        .from('issuers_new')
        .insert({
            issuer_name: issuerName,
            address: "283 Rokeby Road, Subiaco, Western Australia 6008",
            // status: "active", // Removed as per schema error
            display_name: 'Braiin Limited'
        })
        .select()
        .single();

    if (createIssuerError) {
        console.error("❌ Failed to create issuer:", createIssuerError);
        return;
    }
    issuerId = newIssuer.id;
    console.log(`✅ Created Issuer: ${issuerId}`);

    // --- Helper for Restrictions ---
    const restrictionCache = new Map();

    async function getOrCreateRestrictionTemplate(lockupText, legendCode, restrictionFlag) {
        // Construct a unique key and description
        // Priority: Lockup Text > Restriction Flag

        let name = "Restricted";
        let description = "Shares are restricted.";
        let type = "RESTRICTION"; // Code

        if (lockupText && lockupText !== 'None') {
            description = lockupText;
            name = "Lock-up Agreement";
            type = "LOCKUP";
            if (legendCode && legendCode !== 'None') {
                name += ` (Legend ${legendCode})`;
                type += `_${legendCode}`;
            }
        } else if (restrictionFlag === 'Y') {
            name = "General Restriction";
            description = "Shares are marked as restricted in the register.";
            type = "GENERAL_RESTRICTION";
        } else {
            return null; // No restriction
        }

        const cacheKey = `${name}|${description}`; // Corrected cache key
        if (restrictionCache.has(cacheKey)) return restrictionCache.get(cacheKey);

        // Check DB
        const { data: existing } = await supabase
            .from('restrictions_templates_new')
            .select('id')
            .eq('issuer_id', issuerId)
            .eq('description', description) // Description is the most unique part usually
            .maybeSingle();

        if (existing) {
            restrictionCache.set(cacheKey, existing.id);
            return existing.id;
        }

        // Create
        console.log(`📝 Creating restriction template: ${name}`);
        const { data: newTemplate, error } = await supabase
            .from('restrictions_templates_new')
            .insert({
                issuer_id: issuerId,
                restriction_name: name,
                restriction_type: type, // Short code
                description: description,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating template:", error);
            return null;
        }

        restrictionCache.set(cacheKey, newTemplate.id);
        return newTemplate.id;
    }

    // 3. Create Security
    const CUSIP = "BRAIIN-ORD-V2";
    // Wait, let's keep consistent CUSIP if possible or just N/A? Previous was N/A or BRAIIN-ORD. 
    // User said "dont have specific securities... only has a ordinary stock".
    const CLASS_NAME = "Ordinary Shares";
    let securityId;

    const { data: existingSecurity } = await supabase
        .from('securities_new')
        .select('id')
        .eq('issuer_id', issuerId)
        .eq('class_name', CLASS_NAME)
        .maybeSingle();

    if (existingSecurity) {
        securityId = existingSecurity.id;
        console.log(`ℹ️  Security found: ${securityId}`);
    } else {
        const { data: newSecurity, error: secError } = await supabase
            .from('securities_new')
            .insert({
                issuer_id: issuerId,
                class_name: CLASS_NAME,
                issue_name: CLASS_NAME,
                cusip: 'N/A',
                total_authorized_shares: 500000000,
                status: "active",
                created_by: systemUserId // Use UUID
            })
            .select()
            .single();

        if (secError) {
            console.error("❌ Failed to create security:", secError);
            return;
        }
        securityId = newSecurity.id;
        console.log(`✅ Created Security: ${securityId}`);
    }

    // 4. Process Data
    console.log("🔄 Processing rows...");
    let successCount = 0;
    let errorCount = 0;
    const emailToIdMap = new Map();

    for (const row of rawData) {
        try {
            const email = row['Email'] ? row['Email'].trim() : null;
            if (!email) continue;

            // Extract Columns
            const firstName = row['First Name'];
            const lastName = row['Last Name'];
            const address = row['Address'];
            const holderType = row['Holder Type'] || 'Individual';

            const typeRaw = row['Credit / Debit'];
            let txType = 'Issuance'; // Default to Credit/Issuance
            if (typeRaw === 'Debit') txType = 'Cancellation'; // Or Transfer? Usually cancellation if leaving book.
            // Note: If Debit means transfer to someone else, we need the "To". XML doesn't show "To". 
            // So we assume Debit = Reduction/Cancellation or Transfer Out (to unknown).
            // But we found NO Debits in analysis, so this path is theoretical.
            // We treat 'None' as 'Issuance'.

            const shares = row['Shares'];

            // Dates
            let txDate = DEFAULT_DATE;
            if (row['Credit Date']) {
                txDate = excelDateToJSDate(row['Credit Date']);
            } else if (row['Debit Date']) {
                txDate = excelDateToJSDate(row['Debit Date']);
            }

            // New Columns mapping
            const lockup = row['Lock-up Language'];
            const restriction = row['Restrictions'];
            const legend = row['Legend'];

            // ⚡ Handle Restrictions
            let restrictionId = null;
            if ((lockup && lockup !== 'None') || (restriction === 'Y')) {
                restrictionId = await getOrCreateRestrictionTemplate(lockup, legend, restriction);
            }

            let notes = [];
            if (lockup && lockup !== 'None') notes.push(`Lockup: ${lockup}`);
            if (restriction && restriction !== 'N' && restriction !== 'None') notes.push(`Restricted: ${restriction}`);
            if (legend && legend !== 'None') notes.push(`Legend: ${legend}`);

            const noteString = notes.join(' | ');

            // A. Upsert Shareholder
            let shareholderId = emailToIdMap.get(email);
            if (!shareholderId) {
                const { data: existingSh } = await supabase
                    .from('shareholders_new')
                    .select('id')
                    .eq('issuer_id', issuerId)
                    .eq('email', email)
                    .maybeSingle();

                if (existingSh) {
                    shareholderId = existingSh.id;
                } else {
                    const { data: newSh, error: shErr } = await supabase
                        .from('shareholders_new')
                        .insert({
                            issuer_id: issuerId,
                            first_name: firstName,
                            last_name: lastName,
                            email: email,
                            address: address,
                            holder_type: holderType,
                            // status: 'Active' // Removed
                        })
                        .select()
                        .single();
                    if (shErr) throw shErr;
                    shareholderId = newSh.id;
                }
                emailToIdMap.set(email, shareholderId);
            }

            // B. Insert Transaction
            // If Debit, we might want negative?
            // "Issuance" implies positive. "Cancellation" implies negative usually handled by app logic?
            // For now, let's just insert the record as is.

            const { error: txError } = await supabase
                .from('transfers_new')
                .insert({
                    issuer_id: issuerId,
                    shareholder_id: shareholderId,
                    transaction_type: txType,
                    share_quantity: shares, // Always positive in DB usually?
                    transaction_date: txDate.toISOString(),
                    status: 'COMPLETED',
                    certificate_type: 'Book Entry',
                    cusip: 'N/A',
                    notes: noteString || 'Imported v3',
                    restriction_id: restrictionId // <--- Link to restriction
                });
            if (txError) throw txError;

            // C. Update Position
            const { data: existingPos } = await supabase
                .from('shareholder_positions_new')
                .select('id, shares_owned')
                .eq('shareholder_id', shareholderId)
                .eq('security_id', securityId)
                .maybeSingle();

            let delta = shares;
            if (txType === 'Cancellation') delta = -shares;
            // If it was 'Debit' in text but we treat as Cancellation.

            let newBalance = delta;
            if (existingPos) {
                newBalance = existingPos.shares_owned + delta;
                await supabase
                    .from('shareholder_positions_new')
                    .update({ shares_owned: newBalance, updated_at: new Date().toISOString() })
                    .eq('id', existingPos.id);
            } else {
                await supabase
                    .from('shareholder_positions_new')
                    .insert({
                        issuer_id: issuerId,
                        shareholder_id: shareholderId,
                        security_id: securityId,
                        shares_owned: newBalance,
                        position_date: new Date().toISOString()
                        // status: 'Active' // Removed
                    });
            }

            successCount++;
            if (successCount % 10 === 0) process.stdout.write('.');

        } catch (e) {
            console.error(`\n❌ Error row ${successCount}: ${e.message}`);
            errorCount++;
        }
    }

    console.log(`\n\n✅ Finished. Success: ${successCount}, Errors: ${errorCount}`);
}

main();
