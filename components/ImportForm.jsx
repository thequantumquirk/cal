// File: app/(whatever)/components/import/ImportForm.jsx
"use client";

import { useState, useEffect, useRef, memo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

// Modular entity forms (assumes these files exist)
import IssuerForm from "@/components/import/IssuerForm";
import SplitsForm from "@/components/import/SplitsForm";
import SecuritiesForm from "@/components/import/SecuritiesForm";
import OfficersForm from "@/components/import/OfficersForm";
import ShareholdersForm from "@/components/import/ShareholdersForm";
import RecordKeepingBookForm from "@/components/import/RecordKeepingBookForm";
import RecordkeepingTransactionsForm from "@/components/import/RecordkeepingTransactionForm";
import RestrictionsForm from "@/components/import/RestrictionsForm";
import { toDBDate, toUSDate, excelSerialToDBDate } from "@/lib/dateUtils";


export default function ImportForm({ onClose }) {
  const [formData, setFormData] = useState(null);
  const [shareholderMap, setShareholderMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [activeTab, setActiveTab] = useState("issuer");
  const [saveProgress, setSaveProgress] = useState(null); // null, 'saving', 'complete', 'error'
  const [saveResults, setSaveResults] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState(null);
  const [progressStep, setProgressStep] = useState({ step: '', current: 0, total: 0, details: '' });

  // State for redirect countdown
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const redirectTimerRef = useRef(null);
  const savedIssuerIdRef = useRef(null);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.match(/\.(xlsx|xls)$/i)) {
        handleFileUpload({ target: { files: [file] } });
      }
    }
  };

  // --- Direct validation computation on every render (no stale closure) ---
  const computeValidation = () => {
    const transactions = formData?.transactions;
    if (!transactions || transactions.length === 0) {
      return { hasErrors: false, warnings: null };
    }

    const warnings = {
      emptyTransactionTypes: [],
      missingDates: [],
      zeroQuantities: [],
      missingShareholders: [],
      missingCUSIPs: [],
    };

    let hasErrors = false;

    transactions.forEach((tx, idx) => {
      if (!tx.transaction_type || tx.transaction_type === "UNKNOWN") {
        hasErrors = true;
        warnings.emptyTransactionTypes.push({
          row: idx + 1,
          account: tx.shareholder_account || "N/A",
          cusip: tx.cusip || "N/A",
          date: tx.transaction_date || "N/A",
          quantity: tx.share_quantity || 0,
        });
      }
      if (!tx.transaction_date) {
        hasErrors = true;
        warnings.missingDates.push({
          row: idx + 1,
          type: tx.transaction_type || "UNKNOWN",
          account: tx.shareholder_account || "N/A",
        });
      }
      if (!tx.share_quantity || tx.share_quantity === 0) {
        hasErrors = true;
        warnings.zeroQuantities.push({
          row: idx + 1,
          type: tx.transaction_type || "UNKNOWN",
          account: tx.shareholder_account || "N/A",
        });
      }
      if (!tx.shareholder_account || tx.shareholder_account === "") {
        hasErrors = true;
        warnings.missingShareholders.push({
          row: idx + 1,
          type: tx.transaction_type || "UNKNOWN",
          date: tx.transaction_date || "N/A",
        });
      }
      if (!tx.cusip || tx.cusip === "") {
        hasErrors = true;
        warnings.missingCUSIPs.push({
          row: idx + 1,
          type: tx.transaction_type || "UNKNOWN",
          account: tx.shareholder_account || "N/A",
        });
      }
    });

    return { hasErrors, warnings };
  };

  // Compute validation on each render - always fresh
  const validationResult = computeValidation();
  const hasValidationErrors = validationResult.hasErrors;

  // Update validationWarnings state for UI display whenever transactions change
  useEffect(() => {
    // Recompute inside effect to avoid stale closure
    const result = computeValidation();
    setValidationWarnings(result.warnings);
  }, [formData?.transactions]); // Trigger when transactions reference changes

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
      }
    };
  }, []);

  // --- Helpers -------------------------------------------------------------
  const evalFraction = (str) => {
    if (!str && str !== 0) return 0;
    if (typeof str !== "string" && typeof str !== "number") return 0;
    const s = String(str).trim();
    if (s.includes("/")) {
      const [num, den] = s.split("/").map((x) => Number(x));
      if (!isFinite(num) || !isFinite(den) || den === 0) return 0;
      return Number((num / den).toFixed(1));
    }
    const n = Number(s);
    if (isNaN(n)) return 0;
    return Number(n.toFixed(1));
  };

  // find header index by matching keywords (loose)
  const findHeaderIndex = (headers, keywords) => {
    if (!headers || !headers.length) return -1;
    const normalized = headers.map((h) =>
      (h || "").toString().toLowerCase().trim()
    );
    for (const key of keywords) {
      const idx = normalized.findIndex((h) => h.includes(key));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Note: excelDateToJSDate is now replaced by excelSerialToDBDate from dateUtils
  // Keeping this comment for reference during migration

  // --- File upload & parsing (multi-sheet) --------------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        console.info("Workbook sheets:", workbook.SheetNames);

        const extracted = {
          issuer: {},
          splits: [],
          securities: [],
          officers: [],
          shareholders: [],
          restrictions: [],
          recordkeeping: [],
          transactions: [],
        };

        // iterate sheets
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          // defval: '' ensures empty cells become "" instead of undefined
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          if (!rows || !rows.length) return;

          console.debug(`Parsing sheet: "${sheetName}" (rows: ${rows.length})`);

          // Normalize sheetName for detection
          const sName = String(sheetName).toLowerCase();

          if (/issuer|company|spac/i.test(sName)) {
            const fieldMap = {
              "spac name": "issuer_name",
              "issuer name": "issuer_name",
              "company name": "issuer_name",

              "address": "address",
              "headquarters": "address",

              "telephone": "telephone",
              "phone": "telephone",
              "contact": "telephone",

              "tax id": "tax_id",
              "ein": "tax_id",

              "incorporation": "incorporation",
              "place of incorporation": "incorporation",
              "jurisdiction": "incorporation",

              "underwriter": "underwriter",
              "lead underwriter": "underwriter",

              "share information": "share_info",
              "share info": "share_info",
              "authorized shares": "share_info", // map into share_info text

              "security types being issued": "share_info", // combine into share_info as well

              "notes": "notes",
              "remarks": "notes",

              "forms sl status": "forms_sl_status",
              "form sl status": "forms_sl_status",
              "form s-1": "forms_sl_status", // map S-1 status into forms_sl_status

              "timeframe for separation": "timeframe_for_separation",
              "separation ratio": "separation_ratio",

              "exchange": "exchange_platform",
              "exchange platform": "exchange_platform",
              "trading platform": "exchange_platform",
              "listing exchange": "exchange_platform",

              "timeframe for bc": "timeframe_for_bc",
              "business combination timeframe": "timeframe_for_bc",

              "us counsel": "us_counsel",
              "u.s. counsel": "us_counsel",

              "offshore counsel": "offshore_counsel",

              "description": "description",
              "summary": "description",

              "class a ipo issuance": "share_info",
              "class b ipo issuance": "share_info",
              "warrant ipo issuance": "share_info",
              "redemptions": "notes",
            };

            rows.forEach(([key, value]) => {
              if (!key || (value === undefined || value === null)) return;

              const normKey = String(key).replace(/[:]/g, "").trim().toLowerCase();
              const mappedField = fieldMap[normKey];
              if (mappedField) {
                extracted.issuer[mappedField] = value;
                if (mappedField === "issuer_name") {
                  extracted.issuer.display_name = value;
                }

                // Detect split security type (Rights vs Warrants) from separation_ratio
                if (mappedField === "separation_ratio" && value) {
                  const ratioStr = String(value).toLowerCase();
                  if (ratioStr.includes('right')) {
                    extracted.issuer.split_security_type = 'Right';
                    console.log('✅ Auto-detected split_security_type: Right (from separation ratio)');
                  } else if (ratioStr.includes('warrant')) {
                    extracted.issuer.split_security_type = 'Warrant';
                    console.log('✅ Auto-detected split_security_type: Warrant (from separation ratio)');
                  } else {
                    console.log('⚠️ Could not detect split_security_type from separation ratio, will default to Warrant');
                  }
                }
              }
            });

            // ✅ Extract Officers/Directors from Issuer sheet
            // Look for rows with pattern: "NAME, TITLE | OFAC_STATUS"
            console.log('🔍 Searching for Officers/Directors in Issuer sheet...');

            // Use for loop instead of forEach to allow break
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 1) continue;

              const firstCol = String(row[0] || '').trim().toLowerCase();

              // Detect header row like "OFFICER/DIRECTOR OFAC SEARCHES @ 95%"
              if (firstCol.includes('officer') || firstCol.includes('director')) {
                console.log(`  Found officer section at row ${i}`);

                // Parse subsequent rows as officers until we hit empty or different section
                for (let j = i + 1; j < rows.length; j++) {
                  const officerRow = rows[j];
                  if (!officerRow || officerRow.length < 1) break;

                  const nameAndTitle = String(officerRow[0] || '').trim();
                  const ofacStatus = String(officerRow[1] || '').trim();

                  // Stop if we hit another section or empty
                  if (!nameAndTitle || nameAndTitle.toLowerCase().includes('spac')) break;

                  // Parse "NAME, TITLE" format
                  const parts = nameAndTitle.split(',');
                  if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const title = parts.slice(1).join(',').trim();

                    extracted.officers.push({
                      name: name,
                      title: title,
                      ofac_status: ofacStatus && ofacStatus.toLowerCase() !== 'null' ? ofacStatus : null,
                      _raw: officerRow
                    });

                    console.log(`  ✅ Extracted officer: ${name} - ${title}`);
                  }
                }

                break; // Stop after finding officer section
              }
            }

            console.log(`✅ Extracted ${extracted.officers.length} officers/directors`);
          }


          // --- Securities-ish sheet detection ---
          if (/security|cusip|cusip details|securities/i.test(sName)) {
            const headers = rows[0] || [];
            const idxIssueName = findHeaderIndex(headers, ["issue name", "issue"]);
            const idxTicker = findHeaderIndex(headers, ["ticker", "issue ticker"]);
            const idxPlatform = findHeaderIndex(headers, ["platform", "trading platform"]);
            const idxCusip = findHeaderIndex(headers, ["cusip"]);
            const idxType = findHeaderIndex(headers, ["security type", "class"]);
            rows.slice(1).forEach((row) => {
              if (!row || row.length === 0) return;
              const cusip = (row[idxCusip] || "").toString().trim();
              if (!cusip) return;
              extracted.securities.push({
                class_name: row[idxType] || "Unknown",
                cusip,
                issue_name: row[idxIssueName] || (row[0] || ""),
                issue_ticker: row[idxTicker] || "",
                trading_platform: row[idxPlatform] || "",
                _raw: row,
              });
            });
          }

          // --- Officers sheet detection ---
          if (/officer|director|management/i.test(sName)) {
            const headers = rows[0] || [];
            const idxName = findHeaderIndex(headers, ["name", "officer", "director"]);
            const idxPos = findHeaderIndex(headers, ["position", "title", "role"]);
            rows.slice(1).forEach((row) => {
              if (!row || row.length === 0) return;
              const name = row[idxName] || row[0];
              if (!name) return;
              extracted.officers.push({
                officer_name: name,
                officer_position: row[idxPos] || "Unknown",
                _raw: row,
              });
            });
          }

          // --- Restrictions sheet detection ---
          if (/restriction|restrictions/i.test(sName)) {
            console.log('📋 Processing Restrictions sheet...');

            // Find the header row with "CODE" and "LEGEND"
            let headerRowIndex = -1;
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              if (row && row.length >= 2) {
                const col0 = String(row[0] || '').trim().toLowerCase();
                const col1 = String(row[1] || '').trim().toLowerCase();
                if (col0 === 'code' && col1 === 'legend') {
                  headerRowIndex = i;
                  console.log(`  Found restrictions header at row ${i}`);
                  break;
                }
              }
            }

            if (headerRowIndex >= 0) {
              // Parse rows after header
              for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const code = String(row[0] || '').trim();
                const legend = String(row[1] || '').trim();

                // Skip empty rows or invalid data
                if (!code || !legend || code.toUpperCase() === 'NONE' || legend.toUpperCase() === 'NONE') continue;

                extracted.restrictions.push({
                  restriction_code: code,
                  legend_text: legend,
                  _raw: row
                });

                console.log(`  ✅ Extracted restriction: ${code}`);
              }
            }

            console.log(`✅ Extracted ${extracted.restrictions.length} restriction codes`);
          }

          // --- Shareholders sheet detection ---
          if (/shareholder|shareholders|holder/i.test(sName)) {
            const headers = rows[0] || [];


            const idxAccount = findHeaderIndex(headers, ["account", "account number"]);
            const idxFirst = findHeaderIndex(headers, ["first name", "first"]);
            const idxLast = findHeaderIndex(headers, ["last name", "last"]);
            rows.slice(1).forEach((row) => {
              if (!row || row.length === 0) return;
              const acct = row[idxAccount] || row[0] || "";
              if (!acct) return;
              extracted.shareholders.push({
                account_number: acct,
                first_name: row[idxFirst] || "",
                last_name: row[idxLast] || "",
                _raw: row,
              });
            });
          }

          if (/^record\b|record keeping|record-keeping|recordkeeping/i.test(sName)) {
            const headers = (rows[0] || []).map((h) => (h || "").toString().trim().toLowerCase());

            // indexes for securities mapping
            const idxIssueName = findHeaderIndex(headers, ["issue name", "issue"]);
            const idxTicker = findHeaderIndex(headers, ["ticker", "issue ticker"]);
            const idxPlatform = findHeaderIndex(headers, ["trading platform", "platform", "exchange"]);
            const idxCusip = findHeaderIndex(headers, ["cusip", "issue cusip"]);
            const idxSecurityType = findHeaderIndex(headers, ["security type", "class"]);
            const idxTotalAuth = findHeaderIndex(headers, ["total securities issued", "authorized shares"]);

            rows.slice(1).forEach((row, i) => {
              if (!row || row.length === 0) return;

              // ✅ FIX: Skip summary/total rows (detect by checking for "Total" keywords in security_type field)
              const securityTypeRaw = idxSecurityType >= 0 ? String(row[idxSecurityType] || "").trim().toLowerCase() : "";
              if (securityTypeRaw.includes("total") || securityTypeRaw.includes("outstanding") || securityTypeRaw.includes("authorized")) {
                console.log(`⏭️ Skipping summary row ${i + 1}:`, row);
                return;
              }

              const rec = {
                issue_name: (idxIssueName >= 0 ? row[idxIssueName] : "") || "",
                issue_ticker: (idxTicker >= 0 ? row[idxTicker] : "") || "",
                trading_platform: (idxPlatform >= 0 ? row[idxPlatform] : "") || "",
                cusip: (idxCusip >= 0 ? row[idxCusip] : "") || "",
                security_type: (idxSecurityType >= 0 ? row[idxSecurityType] : "") || "",
                total_authorized_shares: (idxTotalAuth >= 0 ? parseInt(String(row[idxTotalAuth]).replace(/[, ]/g, "")) : null),
                _raw: row,
              };

              // keep record for debugging (only if CUSIP exists)
              if (rec.cusip) {
                extracted.recordkeeping.push(rec);
              }

              // pick only IPO Credit row (first positive issuance)
              // pick unique securities based on CUSIP (works for RAAC too)
              if (rec.cusip && !extracted.securities.find(s => s.cusip === rec.cusip)) {
                extracted.securities.push({
                  class_name: rec.security_type || "Unknown",
                  cusip: rec.cusip,
                  issue_name: rec.issue_name,
                  issue_ticker: rec.issue_ticker,
                  trading_platform: rec.trading_platform,
                  total_authorized_shares: rec.total_authorized_shares || null,
                  status: "ACTIVE",
                  _raw: row,
                });
              }

            });
          }

          // --- Control Book sheet detection ---
          if (/control book|control-book|controlbook/i.test(sName)) {
            const headers = (rows[0] || []).map((h) => (h || "").toString().trim().toLowerCase());

            console.log('📋 Processing Control Book sheet');

            const idxIssueName = findHeaderIndex(headers, ["issue name", "issue"]);
            const idxTicker = findHeaderIndex(headers, ["ticker", "issue ticker"]);
            const idxCusip = findHeaderIndex(headers, ["cusip", "issue cusip"]);
            const idxSecurityType = findHeaderIndex(headers, ["security type", "class"]);
            const idxTotalAuth = findHeaderIndex(headers, ["total authorized shares", "authorized shares"]);

            rows.slice(1).forEach((row, i) => {
              if (!row || row.length === 0) return;

              const cusip = (idxCusip >= 0 ? row[idxCusip] : "") || "";
              const securityType = (idxSecurityType >= 0 ? row[idxSecurityType] : "") || "";
              const totalAuthRaw = idxTotalAuth >= 0 ? row[idxTotalAuth] : null;

              // Skip rows without CUSIP or security type
              if (!cusip || !securityType) return;

              // Skip "NA" or invalid Total Authorized values
              if (!totalAuthRaw || totalAuthRaw === "NA" || totalAuthRaw === "N/A") return;

              const totalAuth = parseInt(String(totalAuthRaw).replace(/[, ]/g, "")) || null;
              if (!totalAuth) return;

              console.log(`📊 Control Book - ${securityType} (${cusip}): Total Authorized = ${totalAuth.toLocaleString()}`);

              // Find matching security in extracted.securities and update its total_authorized_shares
              const existingSec = extracted.securities.find(s => s.cusip === cusip);
              if (existingSec) {
                existingSec.total_authorized_shares = totalAuth;
                console.log(`  ✅ Updated existing security ${cusip} with Total Authorized: ${totalAuth.toLocaleString()}`);
              } else {
                // If security doesn't exist yet, create it (this handles cases where Control Book has securities not in Recordkeeping)
                extracted.securities.push({
                  class_name: securityType,
                  cusip: cusip,
                  issue_name: (idxIssueName >= 0 ? row[idxIssueName] : "") || "",
                  issue_ticker: (idxTicker >= 0 ? row[idxTicker] : "") || "",
                  trading_platform: "",
                  total_authorized_shares: totalAuth,
                  status: "ACTIVE",
                  _raw: row,
                });
                console.log(`  ➕ Created new security ${cusip} with Total Authorized: ${totalAuth.toLocaleString()}`);
              }
            });
          }

          // --- Recordkeeping Transactions (force target 2nd sheet) ---
          // ✅ FIX: Skip if Recordkeeping Book sheet exists (to prevent duplicate imports)
          const hasRecordkeepingBookSheet = workbook.SheetNames.some(s => /recordkeeping book/i.test(s));

          if (workbook.SheetNames.indexOf(sheetName) === 1 &&
            !/recordkeeping book/i.test(sName) &&
            !hasRecordkeepingBookSheet) {
            console.info("📑 Extracting transactions from 2nd sheet:", sheetName);
          } else if (workbook.SheetNames.indexOf(sheetName) === 1 && hasRecordkeepingBookSheet) {
            console.info("⏭️ Skipping 2nd sheet transaction extraction - Recordkeeping Book sheet exists");
          }

          if (workbook.SheetNames.indexOf(sheetName) === 1 &&
            !/recordkeeping book/i.test(sName) &&
            !hasRecordkeepingBookSheet) {

            const headers = (rows[0] || []).map((h) => (h || "").toString().trim());
            const headersLower = headers.map((h) => (h || "").toLowerCase());

            // index mapping
            const idxIssueName = findHeaderIndex(headersLower, ["issue name", "issue"]);
            const idxTicker = findHeaderIndex(headersLower, ["ticker", "issue ticker"]);
            const idxPlatform = findHeaderIndex(headersLower, ["platform", "trading platform"]);
            const idxCusip = findHeaderIndex(headersLower, ["cusip", "issue cusip"]);
            const idxSecurityType = findHeaderIndex(headersLower, ["security type", "class"]);
            const idxIssuanceType = findHeaderIndex(headersLower, ["issuance type", "issuance", "type of issuance", "issurance", "type of issurance"]);
            const idxAccount = findHeaderIndex(headersLower, ["account", "holder", "shareholder"]);
            const idxTxType = findHeaderIndex(headersLower, [
              "transaction type",
              "type of transaction",
              "activity",
              "txn type",
            ]);
            const idxCreditDebit = findHeaderIndex(headersLower, ["credit/debit", "credit", "debit"]);
            const idxCreditDate = findHeaderIndex(headersLower, ["credit date"]);
            const idxDebitDate = findHeaderIndex(headersLower, ["debit date"]);
            const idxTxDate = findHeaderIndex(headersLower, ["transaction date", "date"]);
            const idxQty = findHeaderIndex(headersLower, [
              "quantity",
              "qty",
              "shares",
              "total securities processed",
              "total securities issued",
              "total securities",
            ]);
            const idxCert = findHeaderIndex(headersLower, ["certificate", "cert"]);
            const idxStatus = findHeaderIndex(headersLower, ["status"]);
            const idxNotes = findHeaderIndex(headersLower, ["notes", "memo", "remarks"]);

            let lastContext = {};

            // Note: formatDateForDB is now replaced by toDBDate from dateUtils
            // Keeping this comment for reference during migration

            // Helper: check if a field is valid (not NA, N/A, -, empty)
            const validField = (val) => {
              if (!val) return false;
              const s = String(val).trim().toUpperCase();
              return !(s === "" || s === "NA" || s === "N/A" || s === "-");
            };

            rows.slice(1).forEach((row) => {
              if (!row || row.length === 0 || row.every((c) => c === "")) return;

              // ✅ FIX: Skip summary rows by checking multiple fields
              const securityTypeRaw = idxSecurityType >= 0 ? String(row[idxSecurityType] || "").trim().toLowerCase() : "";
              const txTypeRaw = idxTxType >= 0 ? String(row[idxTxType] || "").trim().toLowerCase() : "";
              const issuanceTypeRaw = idxIssuanceType >= 0 ? String(row[idxIssuanceType] || "").trim().toLowerCase() : "";

              if (securityTypeRaw.includes("total") || securityTypeRaw.includes("outstanding") ||
                txTypeRaw.includes("total") || txTypeRaw.includes("outstanding") ||
                issuanceTypeRaw.includes("total") || issuanceTypeRaw.includes("outstanding")) {
                console.log(`⏭️ Skipping summary row in transactions:`, row);
                return;
              }

              const issueName = validField(row[idxIssueName]) ? row[idxIssueName] : lastContext.issue_name || "";
              const ticker = validField(row[idxTicker]) ? row[idxTicker] : lastContext.issue_ticker || "";
              const platform = validField(row[idxPlatform]) ? row[idxPlatform] : lastContext.trading_platform || "";
              const cusip = validField(row[idxCusip]) ? String(row[idxCusip]).trim() : lastContext.cusip || "";
              const securityType = validField(row[idxSecurityType]) ? row[idxSecurityType] : lastContext.security_type || "";
              const issuanceType = validField(row[idxIssuanceType]) ? row[idxIssuanceType] : lastContext.issuance_type || "";

              const shareholderAccount = (idxAccount >= 0 && row[idxAccount]) ? row[idxAccount] : lastContext.shareholder_account || "";  // ✅ Carry forward account
              const txnTypeRaw = idxTxType >= 0 ? row[idxTxType] : "";
              const creditDebitRaw = idxCreditDebit >= 0 ? row[idxCreditDebit] : "";

              // ✅ IMPROVED TRANSACTION TYPE DETECTION
              // Handle multiple Excel formats:
              // 1. "Type of Transaction" column contains actual types (IPO, DWAC Withdrawal, etc.)
              // 2. "Type of Issuance" column contains types in Control Book
              // 3. Sometimes columns are swapped
              // 4. Sometimes transaction type is empty but credit/debit has combined value like "IPO Credit"

              let finalTxnType = "";
              let finalCreditDebit = "";

              const txnTypeStr = String(txnTypeRaw || "").trim();
              const creditDebitStr = String(creditDebitRaw || "").trim();
              const issuanceTypeStr = String(issuanceType || "").trim();

              // Check if values are just Credit/Debit
              const txnTypeIsCD = /^(credit|debit)$/i.test(txnTypeStr);
              const creditDebitIsCD = /^(credit|debit)$/i.test(creditDebitStr);

              // CASE 1: txnType column has actual transaction type (IPO, DWAC Withdrawal, etc.)
              if (txnTypeStr && !txnTypeIsCD) {
                finalTxnType = txnTypeStr;
                finalCreditDebit = creditDebitIsCD ? creditDebitStr : "";
              }
              // CASE 2: txnType is empty but issuanceType has the transaction type
              else if (!txnTypeStr && issuanceTypeStr && !/^(credit|debit)$/i.test(issuanceTypeStr)) {
                finalTxnType = issuanceTypeStr;
                finalCreditDebit = creditDebitIsCD ? creditDebitStr : "";
                console.log(`📌 Using Issuance Type as Transaction Type: "${finalTxnType}"`);
              }
              // CASE 3: txnType has Credit/Debit, creditDebit may have actual type (swapped)
              else if (txnTypeIsCD && creditDebitStr && !creditDebitIsCD) {
                console.log(`🔄 Detected swapped columns - Transaction Type="${txnTypeStr}", Credit/Debit="${creditDebitStr}"`);
                finalCreditDebit = txnTypeStr;
                finalTxnType = creditDebitStr.replace(/\s*(Credit|Debit)\s*$/i, "").trim() || creditDebitStr;
              }
              // CASE 4: creditDebit has combined value like "IPO Credit"
              else if (creditDebitStr && !creditDebitIsCD) {
                finalTxnType = creditDebitStr.replace(/\s*(Credit|Debit)\s*$/i, "").trim();
                const match = creditDebitStr.match(/\s*(Credit|Debit)\s*$/i);
                finalCreditDebit = match ? match[1] : "";
              }
              // CASE 5: Both have simple values
              else {
                finalTxnType = txnTypeStr || issuanceTypeStr || "";
                finalCreditDebit = creditDebitStr || "";
              }

              // Derive credit/debit from transaction type if not already set
              if (!finalCreditDebit || finalCreditDebit === "") {
                const txLower = finalTxnType.toLowerCase();
                if (txLower.includes('withdrawal') || txLower.includes('debit') || txLower.includes('transfer debit')) {
                  finalCreditDebit = "Debit";
                } else if (txLower.includes('deposit') || txLower.includes('credit') || txLower.includes('ipo') || txLower.includes('transfer credit')) {
                  finalCreditDebit = "Credit";
                } else {
                  finalCreditDebit = "Credit"; // Default
                }
                console.log(`📌 Derived Credit/Debit from transaction type "${finalTxnType}" → "${finalCreditDebit}"`);
              }

              // Log for debugging
              if (!finalTxnType || finalTxnType === "" || finalTxnType.toLowerCase() === "credit" || finalTxnType.toLowerCase() === "debit") {
                console.warn(`⚠️ Transaction type detection issue:`, {
                  txnTypeRaw,
                  creditDebitRaw,
                  finalTxnType,
                  finalCreditDebit,
                  account: shareholderAccount,
                  row: row
                });
              }

              // --- Date parsing (avoiding timezone shifts) ---
              // ✅ FIX: Robust Credit/Debit date detection - handles switching between credit and debit rows
              const rawCreditDate = idxCreditDate >= 0 ? row[idxCreditDate] : null;
              const rawDebitDate = idxDebitDate >= 0 ? row[idxDebitDate] : null;
              const rawTxDate = idxTxDate >= 0 ? row[idxTxDate] : null;

              // Helper: is this a usable date value?
              const hasDateVal = (v) => {
                if (v === null || v === undefined) return false;
                if (typeof v === 'number' && v > 0) return true;
                if (typeof v === 'string' && v.trim() !== '') return true;
                if (v instanceof Date && !isNaN(v)) return true;
                return false;
              };

              // Pick first valid date source (Credit > Debit > Transaction Date)
              let rawDate = hasDateVal(rawCreditDate) ? rawCreditDate :
                hasDateVal(rawDebitDate) ? rawDebitDate :
                  hasDateVal(rawTxDate) ? rawTxDate : null;

              // Debug log for debit date usage
              if (!hasDateVal(rawCreditDate) && hasDateVal(rawDebitDate)) {
                console.log(`📅 [2nd Sheet] Using Debit Date (Credit was empty):`, {
                  account: shareholderAccount,
                  debitDate: rawDebitDate,
                  creditDebit: finalCreditDebit
                });
              }

              let transaction_date = null;

              if (rawDate instanceof Date) {
                transaction_date = rawDate;
              } else if (typeof rawDate === "number") {
                transaction_date = excelSerialToDBDate(rawDate);
              } else if (rawDate) {
                const dateStr = String(rawDate).trim();

                // Try MM/DD/YYYY or M/D/YYYY format
                if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
                  const parts = dateStr.split("/");
                  if (parts.length === 3) {
                    const [m, d, y] = parts.map((p) => parseInt(p, 10));
                    const fullYear = y < 100 ? 2000 + y : y;
                    // Use Date.UTC to create date in UTC, avoiding local timezone
                    transaction_date = new Date(Date.UTC(fullYear, m - 1, d));
                  }
                }
                // Try YYYY-MM-DD format
                else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                  const [y, m, d] = dateStr.split("-").map((p) => parseInt(p, 10));
                  transaction_date = new Date(Date.UTC(y, m - 1, d));
                }
                // Fallback: try generic Date parsing
                else {
                  const tryD = new Date(dateStr);
                  if (!isNaN(tryD)) transaction_date = tryD;
                }
              }

              const formattedDate = toDBDate(transaction_date);

              // Quantity parsing
              const rawQty = idxQty >= 0 ? row[idxQty] : 0;
              const share_quantity =
                typeof rawQty === "number"
                  ? Math.floor(rawQty)
                  : parseInt(String(rawQty || "0").replace(/[, ]+/g, ""), 10) || 0;

              const certificateType = idxCert >= 0 ? row[idxCert] : "";
              let rawStatus = idxStatus >= 0 ? String(row[idxStatus] || "").trim().toUpperCase() : "";
              const status = rawStatus && rawStatus !== "-" ? rawStatus : "ACTIVE";

              const notes = idxNotes >= 0 && row[idxNotes] ? String(row[idxNotes]).trim() : "NIL";

              // Push transaction row
              extracted.transactions.push({
                issuer_id: extracted.issuer?.id || null,
                cusip,
                transaction_type: finalTxnType || "UNKNOWN",
                share_quantity,
                shareholder_id: "f6d974d5-8696-4fba-99b9-25805601acbb",
                restriction_id: null,
                transaction_date: formattedDate,
                status,
                notes,
                certificate_type: certificateType || "Book Entry",
                _raw: row,
                issue_name: issueName,
                issue_ticker: ticker,
                trading_platform: platform,
                security_type: securityType,
                issuance_type: issuanceType,
                shareholder_account: shareholderAccount,
                credit_debit: finalCreditDebit, // ✅ Use corrected value after swap detection
              });

              // ✅ Update context safely (no NA overwrites)
              lastContext = {
                issue_name: validField(issueName) ? issueName : lastContext.issue_name,
                issue_ticker: validField(ticker) ? ticker : lastContext.issue_ticker,
                trading_platform: validField(platform) ? platform : lastContext.trading_platform,
                cusip: validField(cusip) ? cusip : lastContext.cusip,
                security_type: validField(securityType) ? securityType : lastContext.security_type,
                issuance_type: validField(issuanceType) ? issuanceType : lastContext.issuance_type,
                shareholder_account: shareholderAccount || lastContext.shareholder_account,  // ✅ Preserve account for next row
              };
            });

            console.info(`✅ Extracted ${extracted.transactions.length} transactions from sheet[1] (${sheetName})`);
          }

          // --- Shareholders sheet detection (2nd sheet usually, but detect keywords) ---
          // --- Recordkeeping Book (transactions + shareholders) ---
          if (/recordkeeping book/i.test(sName)) {
            console.info("📑 Extracting from Recordkeeping Book:", sheetName);

            const headers = (rows[0] || []).map((h) => (h || "").toString().trim());
            const headersLower = headers.map((h) => (h || "").toLowerCase());

            // --- Transaction indexes ---
            const idxIssueName = findHeaderIndex(headersLower, ["issue name", "issue"]);
            const idxTicker = findHeaderIndex(headersLower, ["ticker", "issue ticker"]);
            const idxPlatform = findHeaderIndex(headersLower, ["platform", "trading platform"]);
            const idxCusip = findHeaderIndex(headersLower, ["cusip", "issue cusip"]);
            const idxSecurityType = findHeaderIndex(headersLower, ["security type", "class"]);
            const idxIssuanceType = findHeaderIndex(headersLower, ["issuance type", "issuance", "type of issuance", "issurance", "type of issurance"]);
            const idxAccount = findHeaderIndex(headersLower, ["account", "account no", "account number"]);
            const idxTxType = findHeaderIndex(headersLower, ["transaction type", "type of transaction", "activity", "txn type"]);
            const idxCreditDebit = findHeaderIndex(headersLower, ["credit/debit", "credit", "debit"]);
            const idxCreditDate = findHeaderIndex(headersLower, ["credit date"]);
            const idxDebitDate = findHeaderIndex(headersLower, ["debit date"]);
            const idxTxDate = findHeaderIndex(headersLower, ["transaction date", "date"]);
            const idxQty = findHeaderIndex(headersLower, ["quantity", "qty", "shares", "total securities issued", "total securities processed", "total securities"]);
            const idxCert = findHeaderIndex(headersLower, ["certificate", "cert"]);
            const idxStatus = findHeaderIndex(headersLower, ["status"]);
            const idxNotes = findHeaderIndex(headersLower, ["notes", "memo", "remarks"]);

            // --- Shareholder indexes ---
            const idxFirst = findHeaderIndex(headersLower, ["first name", "shareholder first name"]);
            const idxLast = findHeaderIndex(headersLower, ["last name", "shareholder/entity last name"]);
            const idxLei = findHeaderIndex(headersLower, ["lei"]);
            const idxType = findHeaderIndex(headersLower, ["holder type", "type"]);
            const idxAddress = findHeaderIndex(headersLower, ["address"]);
            const idxCity = findHeaderIndex(headersLower, ["city"]);
            const idxState = findHeaderIndex(headersLower, ["state"]);
            const idxZip = findHeaderIndex(headersLower, ["zip", "postal"]);
            const idxCountry = findHeaderIndex(headersLower, ["country"]);
            const idxTaxId = findHeaderIndex(headersLower, ["taxpayer id", "tin"]);
            const idxTinStatus = findHeaderIndex(headersLower, ["tin status"]);
            const idxEmail = findHeaderIndex(headersLower, ["email"]);
            const idxPhone = findHeaderIndex(headersLower, ["phone", "contact"]);
            const idxOwnership = findHeaderIndex(headersLower, ["% ownership", "ownership"]);
            const idxOfac = findHeaderIndex(headersLower, ["ofac", "ofac date"]);
            const idxDob = findHeaderIndex(headersLower, ["dob", "date of birth"]);

            let lastContext = {};

            rows.slice(1).forEach((row) => {
              if (!row || row.length === 0 || row.every((c) => c === "")) return;

              // ✅ FIX: Skip summary rows in Recordkeeping Book
              const securityTypeRaw = idxSecurityType >= 0 ? String(row[idxSecurityType] || "").trim().toLowerCase() : "";
              const txTypeRaw = idxTxType >= 0 ? String(row[idxTxType] || "").trim().toLowerCase() : "";
              const issuanceTypeRaw = idxIssuanceType >= 0 ? String(row[idxIssuanceType] || "").trim().toLowerCase() : "";

              if (securityTypeRaw.includes("total") || securityTypeRaw.includes("outstanding") ||
                txTypeRaw.includes("total") || txTypeRaw.includes("outstanding") ||
                issuanceTypeRaw.includes("total") || issuanceTypeRaw.includes("outstanding")) {
                console.log(`⏭️ Skipping summary row in Recordkeeping Book:`, row);
                return;
              }



              // --- Transaction row ---
              const issueName = row[idxIssueName] || lastContext.issue_name || "";
              const ticker = row[idxTicker] || lastContext.issue_ticker || "";
              const platform = row[idxPlatform] || lastContext.trading_platform || "";
              const cusip = row[idxCusip] || lastContext.cusip || "";
              const securityType = row[idxSecurityType] || lastContext.security_type || "";   // ✅ FIXED
              const issuanceType = row[idxIssuanceType] || lastContext.issuance_type || "";   // ✅ FIXED
              const shareholderAccount = row[idxAccount] || lastContext.shareholder_account || "";  // ✅ Carry forward account

              const txnTypeRaw = row[idxTxType] || "";
              const creditDebitRaw = row[idxCreditDebit] || "";

              // ✅ IMPROVED TRANSACTION TYPE DETECTION (same as 2nd sheet)
              // Handle multiple Excel formats:
              // 1. "Type of Transaction" column contains actual types (IPO, DWAC Withdrawal, etc.)
              // 2. "Type of Issuance" column contains types in Control Book
              // 3. Sometimes columns are swapped
              // 4. Sometimes transaction type is empty but credit/debit has combined value like "IPO Credit"

              let finalTxnType = "";
              let finalCreditDebit = "";

              const txnTypeStr = String(txnTypeRaw || "").trim();
              const creditDebitStr = String(creditDebitRaw || "").trim();
              const issuanceTypeStr = String(issuanceType || "").trim();

              // Check if values are just Credit/Debit
              const txnTypeIsCD = /^(credit|debit)$/i.test(txnTypeStr);
              const creditDebitIsCD = /^(credit|debit)$/i.test(creditDebitStr);

              // CASE 1: txnType column has actual transaction type (IPO, DWAC Withdrawal, etc.)
              if (txnTypeStr && !txnTypeIsCD) {
                finalTxnType = txnTypeStr;
                finalCreditDebit = creditDebitIsCD ? creditDebitStr : "";
              }
              // CASE 2: txnType is empty but issuanceType has the transaction type
              else if (!txnTypeStr && issuanceTypeStr && !/^(credit|debit)$/i.test(issuanceTypeStr)) {
                finalTxnType = issuanceTypeStr;
                finalCreditDebit = creditDebitIsCD ? creditDebitStr : "";
                console.log(`📌 [Recordkeeping Book] Using Issuance Type as Transaction Type: "${finalTxnType}"`);
              }
              // CASE 3: txnType has Credit/Debit, creditDebit may have actual type (swapped)
              else if (txnTypeIsCD && creditDebitStr && !creditDebitIsCD) {
                console.log(`🔄 [Recordkeeping Book] Detected swapped columns - Transaction Type="${txnTypeStr}", Credit/Debit="${creditDebitStr}"`);
                finalCreditDebit = txnTypeStr;
                finalTxnType = creditDebitStr.replace(/\s*(Credit|Debit)\s*$/i, "").trim() || creditDebitStr;
              }
              // CASE 4: creditDebit has combined value like "IPO Credit"
              else if (creditDebitStr && !creditDebitIsCD) {
                finalTxnType = creditDebitStr.replace(/\s*(Credit|Debit)\s*$/i, "").trim();
                const match = creditDebitStr.match(/\s*(Credit|Debit)\s*$/i);
                finalCreditDebit = match ? match[1] : "";
              }
              // CASE 5: Both have simple values
              else {
                finalTxnType = txnTypeStr || issuanceTypeStr || "";
                finalCreditDebit = creditDebitStr || "";
              }

              // Derive credit/debit from transaction type if not already set
              if (!finalCreditDebit || finalCreditDebit === "") {
                const txLower = finalTxnType.toLowerCase();
                if (txLower.includes('withdrawal') || txLower.includes('debit') || txLower.includes('transfer debit')) {
                  finalCreditDebit = "Debit";
                } else if (txLower.includes('deposit') || txLower.includes('credit') || txLower.includes('ipo') || txLower.includes('transfer credit')) {
                  finalCreditDebit = "Credit";
                } else {
                  finalCreditDebit = "Credit"; // Default
                }
                console.log(`📌 [Recordkeeping Book] Derived Credit/Debit from transaction type "${finalTxnType}" → "${finalCreditDebit}"`);
              }

              // Parse date (avoiding timezone shifts)
              // ✅ FIX: Robust Credit/Debit date detection - handles switching between credit and debit rows
              const creditDateVal = idxCreditDate >= 0 ? row[idxCreditDate] : null;
              const debitDateVal = idxDebitDate >= 0 ? row[idxDebitDate] : null;
              const txDateVal = idxTxDate >= 0 ? row[idxTxDate] : null;

              // Helper: is this a usable date value? (not null, undefined, empty string, or whitespace)
              const hasDateValue = (v) => {
                if (v === null || v === undefined) return false;
                if (typeof v === 'number' && v > 0) return true; // Excel serial number
                if (typeof v === 'string' && v.trim() !== '') return true;
                if (v instanceof Date && !isNaN(v)) return true;
                return false;
              };

              // Pick first valid date source (Credit > Debit > Transaction Date)
              let rawDate = hasDateValue(creditDateVal) ? creditDateVal :
                hasDateValue(debitDateVal) ? debitDateVal :
                  hasDateValue(txDateVal) ? txDateVal : null;

              // Log when switching from Credit to Debit date (helps debug)
              if (!hasDateValue(creditDateVal) && hasDateValue(debitDateVal)) {
                console.log(`📅 Using Debit Date for row (Credit Date was empty):`, {
                  account: row[idxAccount],
                  debitDate: debitDateVal,
                  creditDebit: finalCreditDebit
                });
              }

              let transaction_date = null;

              if (rawDate instanceof Date) {
                transaction_date = rawDate;
              } else if (typeof rawDate === "number") {
                transaction_date = excelSerialToDBDate(rawDate);
              } else if (rawDate) {
                const dateStr = String(rawDate).trim();

                // Try MM/DD/YYYY or M/D/YYYY format
                if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
                  const parts = dateStr.split("/");
                  if (parts.length === 3) {
                    const [m, d, y] = parts.map((p) => parseInt(p, 10));
                    const fullYear = y < 100 ? 2000 + y : y;
                    transaction_date = new Date(Date.UTC(fullYear, m - 1, d));
                  }
                }
                // Try YYYY-MM-DD format
                else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                  const [y, m, d] = dateStr.split("-").map((p) => parseInt(p, 10));
                  transaction_date = new Date(Date.UTC(y, m - 1, d));
                }
                // Fallback
                else {
                  const tryD = new Date(dateStr);
                  if (!isNaN(tryD)) transaction_date = tryD;
                }
              }

              // ✅ Use date from last context if current row has no date (Excel groups transactions by date)
              if (!transaction_date && lastContext.transaction_date) {
                transaction_date = lastContext.transaction_date;
                console.log(`📅 Using date from context: ${transaction_date}`);
              }

              // ✅ Convert Date to YYYY-MM-DD string for consistent storage (fixes locale issues)
              const formattedDate = toDBDate(transaction_date);

              const share_quantity = parseInt(String(row[idxQty] || "0").replace(/[, ]+/g, ""), 10) || 0;

              // 🔍 DEBUG: Log Class A (G17564108) transactions being parsed
              if (cusip === 'G17564108') {
                console.log(`🔍 [PARSER] Class A Transaction: type="${finalTxnType}", credit_debit="${finalCreditDebit}", qty=${share_quantity}, date=${transaction_date}`);
              }

              extracted.transactions.push({
                issuer_id: extracted.issuer?.id || null,
                cusip,
                transaction_type: finalTxnType || "UNKNOWN",
                share_quantity,
                shareholder_account: shareholderAccount,  // ✅ Use carried-forward account
                transaction_date: formattedDate,  // ✅ Use formatted YYYY-MM-DD string
                certificate_type: row[idxCert] || "Book Entry",
                status: row[idxStatus] || "ACTIVE",
                notes: row[idxNotes] || "NIL",
                issue_name: issueName,
                issue_ticker: ticker,
                trading_platform: platform,
                security_type: securityType,   // ✅ FIXED reference
                issuance_type: issuanceType,   // ✅ FIXED reference
                credit_debit: finalCreditDebit, // ✅ Use corrected value after swap detection
                _raw: row,
              });

              // Update context (including date and account for next row)
              lastContext = {
                issue_name: issueName,
                issue_ticker: ticker,
                trading_platform: platform,
                cusip,
                security_type: securityType,
                issuance_type: issuanceType,
                transaction_date: formattedDate || lastContext.transaction_date,  // ✅ Use formatted date for context
                shareholder_account: shareholderAccount || lastContext.shareholder_account  // ✅ Preserve account for next row
              };

              // --- Shareholder row ---
              extracted.shareholders.push({
                account_number: shareholderAccount,  // ✅ Use carried-forward account
                first_name: row[idxFirst] || "",
                last_name: row[idxLast] || "",
                lei: row[idxLei] || "",
                holder_type: row[idxType] || "",
                address: row[idxAddress] || "",
                city: row[idxCity] || "",
                state: row[idxState] || "",
                zip: row[idxZip] || "",
                country: row[idxCountry] || "",
                taxpayer_id: row[idxTaxId] || "",
                tin_status: row[idxTinStatus] || "",
                email: row[idxEmail] || "",
                phone: row[idxPhone] || "",
                ofac_date: idxOfac >= 0 ? excelSerialToDBDate(row[idxOfac]) : null,
                dob: idxDob >= 0 ? excelSerialToDBDate(row[idxDob]) : null,
                _raw: row,
              });

            });

            console.info(`✅ Extracted ${extracted.transactions.length} transactions`);
            console.info(`✅ Extracted ${extracted.shareholders.length} shareholders`);
          }


          // end transactions sheet detection
        }); // end sheets loop

        // Auto-detect split security type from securities and transactions if not already set
        if (!extracted.issuer.split_security_type || extracted.issuer.split_security_type === 'Warrant') {
          console.log('🔍 Auto-detecting split security type (Rights vs Warrants)...');

          // Check securities
          const hasRights = extracted.securities.some(sec => {
            const secType = String(sec.class_name || sec.security_type || '').toLowerCase();
            return secType.includes('right') && !secType.includes('warrant');
          });

          const hasWarrants = extracted.securities.some(sec => {
            const secType = String(sec.class_name || sec.security_type || '').toLowerCase();
            return secType.includes('warrant') || secType.includes('redeemable');
          });

          // Check transactions as well
          const txHasRights = extracted.transactions.some(tx => {
            const secType = String(tx.security_type || '').toLowerCase();
            return secType.includes('right') && !secType.includes('warrant');
          });

          const txHasWarrants = extracted.transactions.some(tx => {
            const secType = String(tx.security_type || '').toLowerCase();
            return secType.includes('warrant') || secType.includes('redeemable');
          });

          if (hasRights || txHasRights) {
            extracted.issuer.split_security_type = 'Right';
            console.log('✅ Detected split security type: Right');
          } else if (hasWarrants || txHasWarrants) {
            extracted.issuer.split_security_type = 'Warrant';
            console.log('✅ Detected split security type: Warrant');
          } else {
            // Default to Warrant if nothing detected
            extracted.issuer.split_security_type = 'Warrant';
            console.log('ℹ️ No Rights/Warrants detected, defaulting to: Warrant');
          }
        } else {
          console.log(`ℹ️ Split security type already set from separation_ratio: ${extracted.issuer.split_security_type}`);
        }

        // debugging summary
        console.groupCollapsed("Import parse summary");
        console.log("Issuer:", extracted.issuer);
        console.log("Splits count:", extracted.splits.length);
        console.log("Securities count:", extracted.securities.length);
        if (extracted.securities.length > 0) {
          console.table(extracted.securities.map(s => ({
            issue_name: s.issue_name,
            ticker: s.issue_ticker,
            cusip: s.cusip,
            class: s.class_name,
            platform: s.trading_platform,
            total_auth: s.total_authorized_shares || "NA",
            status: s.status || "NA"
          })));
        }


        console.log("Officers count:", extracted.officers.length);
        if (extracted.officers.length > 0) {
          console.table(extracted.officers.map(o => ({
            name: o.name,
            title: o.title,
            ofac: o.ofac_status || "N/A"
          })));
        }
        console.log("Restrictions count:", extracted.restrictions.length);
        if (extracted.restrictions.length > 0) {
          console.table(extracted.restrictions.map(r => ({
            code: r.restriction_code,
            legend_preview: r.legend_text.substring(0, 50) + "..."
          })));
        }
        console.log("Shareholders count:", extracted.shareholders.length);
        console.log("Recordkeeping summary count:", extracted.recordkeeping.length);
        console.log("Transactions count:", extracted.transactions.length);
        if (extracted.transactions.length > 0) {
          console.log("Sample transaction:", extracted.transactions[0]);
        }
        console.groupEnd();

        // ✅ DATA VALIDATION - Check for issues
        const warnings = {
          emptyTransactionTypes: [],
          missingDates: [],
          zeroQuantities: [],
          missingShareholders: [],
          missingCUSIPs: [],
        };

        // Validate transactions
        extracted.transactions.forEach((tx, idx) => {
          if (!tx.transaction_type || tx.transaction_type === "UNKNOWN") {
            warnings.emptyTransactionTypes.push({
              row: idx + 1,
              account: tx.shareholder_account || "N/A",
              cusip: tx.cusip || "N/A",
              date: tx.transaction_date || "N/A",
              quantity: tx.share_quantity || 0,
            });
          }
          if (!tx.transaction_date) {
            warnings.missingDates.push({
              row: idx + 1,
              type: tx.transaction_type || "UNKNOWN",
              account: tx.shareholder_account || "N/A",
            });
          }
          if (!tx.share_quantity || tx.share_quantity === 0) {
            warnings.zeroQuantities.push({
              row: idx + 1,
              type: tx.transaction_type || "UNKNOWN",
              account: tx.shareholder_account || "N/A",
            });
          }
          if (!tx.shareholder_account || tx.shareholder_account === "") {
            warnings.missingShareholders.push({
              row: idx + 1,
              type: tx.transaction_type || "UNKNOWN",
              date: tx.transaction_date || "N/A",
            });
          }
          if (!tx.cusip || tx.cusip === "") {
            warnings.missingCUSIPs.push({
              row: idx + 1,
              type: tx.transaction_type || "UNKNOWN",
              account: tx.shareholder_account || "N/A",
            });
          }
        });

        // Calculate totals
        const totalWarnings =
          warnings.emptyTransactionTypes.length +
          warnings.missingDates.length +
          warnings.zeroQuantities.length +
          warnings.missingShareholders.length +
          warnings.missingCUSIPs.length;

        console.log("📊 Data Validation Results:", {
          totalWarnings,
          breakdown: {
            emptyTransactionTypes: warnings.emptyTransactionTypes.length,
            missingDates: warnings.missingDates.length,
            zeroQuantities: warnings.zeroQuantities.length,
            missingShareholders: warnings.missingShareholders.length,
            missingCUSIPs: warnings.missingCUSIPs.length,
          }
        });

        setFormData(extracted);
        setValidationWarnings(warnings);
        setActiveTab("issuer");
      } catch (err) {
        console.error("File parse error:", err);
        setSaveProgress('error');
        setSaveResults({ type: 'error', message: 'Error parsing uploaded file — check console for details.' });

      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Update section helper ------------------------------------------------
  const updateSection = (section, value) => {
    // When updating transactions, strip out display-only fields that were added during mapping
    // This ensures validation recalculates properly with clean data
    if (section === "transactions" && Array.isArray(value)) {
      const cleanedTransactions = value.map(tx => {
        // Remove display-only fields that were added in the JSX mapping
        const { shareholder_name, shareholder_id, ...cleanTx } = tx;
        return cleanTx;
      });
      setFormData((prev) => ({
        ...prev,
        [section]: cleanedTransactions,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [section]: value,
      }));
    }
  };

  // --- Save flow with detailed debug ---------------------------------------
  const saveIssuerAndRelated = async (override = false) => {
    if (!formData) {
      setSaveProgress('error');
      setSaveResults({ type: 'error', message: 'No data to save. Please upload a file first.' });
      return;

    }
    setLoading(true);
    setSaveProgress('saving');
    setSaveResults(null);

    const counts = {
      splits: formData.splits?.length || 0,
      securities: formData.securities?.length || 0,
      officers: formData.officers?.length || 0,
      restrictions: formData.restrictions?.length || 0,
      shareholders: formData.shareholders?.length || 0,
      recordkeeping: formData.recordkeeping?.length || 0,
      transactions: formData.transactions?.length || 0,
    };

    console.info("Saving — parsed payload counts:", counts);

    // Calculate total steps for progress tracking
    const totalSteps = 1 + // issuer
      counts.splits +
      counts.securities +
      counts.officers +
      counts.restrictions +
      1 + // shareholders (bulk)
      1 + // transactions (bulk)
      1 + // positions
      1; // documents

    let currentStep = 0;

    const updateProgress = (step, details = '') => {
      currentStep++;
      setProgressStep({ step, current: currentStep, total: totalSteps, details });
    };

    const results = {
      issuer: null,
      splits: { ok: 0, failed: [] },
      securities: { ok: 0, failed: [] },
      officers: { ok: 0, failed: [] },
      restrictions: { ok: 0, failed: [] },
      shareholders: { ok: 0, failed: [] },
      recordkeeping: { ok: 0, failed: [] },
      transactions: { ok: 0, failed: [] },
    };

    try {
      // 1) Save issuer -> /api/issuers/import
      updateProgress('Saving issuer information', `${formData.issuer?.company_name || 'Company'}`);
      const resIssuer = await fetch("/api/issuers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...formData.issuer,
          override,
        }),
      });

      const payloadIssuer = await resIssuer.json().catch(() => ({}));
      console.log("Issuer API response:", resIssuer.status, payloadIssuer);

      if (payloadIssuer?.exists) {
        setConflictData(payloadIssuer.issuer);
        setSaveResults({ type: 'warning', message: 'Issuer already exists — pre-populated. Resolve conflict or choose override.' });
        setLoading(false);
        return;
      }

      if (!resIssuer.ok) {
        console.error("Issuer save failed:", payloadIssuer);
        throw new Error(payloadIssuer?.error || "Issuer save failed");
      }

      // issuerId safe extraction: support multiple backend shapes
      const issuerId =
        payloadIssuer?.issuer?.id ||
        payloadIssuer?.id ||
        payloadIssuer?.issuer_id ||
        payloadIssuer?.data?.id;

      if (!issuerId) {
        console.error("Could not determine issuer id from response:", payloadIssuer);
        throw new Error("Could not determine saved issuer ID");
      }

      results.issuer = issuerId;
      console.log("Saved issuer id:", issuerId);

      // helper to post array and collect results
      const postMany = async (items, url, entityName, mapBeforeSend) => {
        for (const [i, it] of (items || []).entries()) {
          updateProgress(`Creating ${entityName}`, `${i + 1} of ${items.length}`);

          try {
            const payload = mapBeforeSend ? mapBeforeSend(it) : it;
            const r = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ issuer_id: issuerId, ...payload }),
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) {
              console.warn(`${entityName} row ${i} failed`, r.status, body);
              results[entityName].failed.push({ index: i, row: it, status: r.status, body });
            } else {
              results[entityName].ok += 1;
            }
          } catch (err) {
            console.error(`${entityName} row ${i} exception:`, err);
            results[entityName].failed.push({ index: i, row: it, error: String(err) });
          }
        }
      };

      // 2) Splits -> /api/splits
      await postMany(
        formData.splits || [],
        "/api/splits",
        "splits",
        (s) => ({
          transaction_type: s.transaction_type || "DWAC Withdrawa",
          class_a_ratio:
            typeof s.class_a_ratio === "number"
              ? Number(s.class_a_ratio.toFixed(1))
              : Number(parseFloat(s.class_a_ratio || 0).toFixed(1)),
          rights_ratio:
            typeof s.rights_ratio === "number"
              ? Number(s.rights_ratio.toFixed(1))
              : Number(parseFloat(s.rights_ratio || 0).toFixed(1)),
        })
      );


      // 3) Securities -> /api/securities (dedupe by CUSIP per issuer)
      // ✅ Build CUSIP→ID mapping directly from POST responses to avoid HTTP cache issues
      const cusipToSecurityMap = {};
      if (formData.securities && formData.securities.length > 0) {
        // Deduplicate
        const uniqueSecurities = Array.from(
          new Map((formData.securities || []).map(s => [s.cusip, s])).values()
        );

        console.info(
          `📦 Securities deduped: ${uniqueSecurities.length} unique CUSIPs (from ${formData.securities.length} rows)`
        );

        // POST securities one by one and capture the returned IDs (avoids HTTP cache)
        for (const [i, sec] of uniqueSecurities.entries()) {
          updateProgress('Creating securities', `${sec.issue_name || sec.cusip} (${i + 1}/${uniqueSecurities.length})`);

          try {
            const payload = {
              issuer_id: issuerId,
              class_name: sec.class_name || "Unknown",
              cusip: sec.cusip || null,
              issue_name: sec.issue_name || null,
              issue_ticker: sec.issue_ticker || null,
              trading_platform: sec.trading_platform || null,
              total_authorized_shares: Number(sec.total_authorized_shares || 0),
              status: sec.status || "ACTIVE",
            };

            const r = await fetch("/api/securities", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(payload),
            });

            const body = await r.json().catch(() => ({}));

            if (!r.ok) {
              console.warn(`securities row ${i} failed`, r.status, body);
              results.securities.failed.push({ index: i, row: sec, status: r.status, body });
            } else {
              results.securities.ok += 1;
              // Capture CUSIP → ID mapping immediately from the response
              if (body.cusip && body.id) {
                cusipToSecurityMap[body.cusip] = body.id;
                console.log(`✅ Mapped CUSIP ${body.cusip} → ${body.id}`);
              }
            }
          } catch (err) {
            console.error(`securities row ${i} exception:`, err);
            results.securities.failed.push({ index: i, row: sec, error: String(err) });
          }
        }

        console.log("📊 CUSIP to Security mapping (from POST responses):", cusipToSecurityMap);
      }

      // 4) Officers -> /api/officers
      await postMany(formData.officers || [], "/api/officers", "officers", (o) => ({
        officer_name: o.name,
        officer_position: o.title,
        results: o.ofac_status || null
      }));

      // 4.5) Restrictions -> /api/restriction-templates (if available)
      if (formData.restrictions && formData.restrictions.length > 0) {
        console.log(`📋 Processing ${formData.restrictions.length} restriction templates...`);

        // ✅ DEDUPLICATE restrictions by restriction_code within the import file
        const uniqueRestrictions = {};
        formData.restrictions.forEach(r => {
          const code = r.restriction_code?.trim();
          if (!code) return;

          // Keep first occurrence or merge data (prefer non-empty legend_text)
          if (!uniqueRestrictions[code]) {
            uniqueRestrictions[code] = r;
          } else {
            const existing = uniqueRestrictions[code];
            uniqueRestrictions[code] = {
              ...existing,
              legend_text: existing.legend_text || r.legend_text
            };
          }
        });

        const deduplicatedRestrictions = Object.values(uniqueRestrictions);
        console.log(`📋 Deduplicated to ${deduplicatedRestrictions.length} unique restriction templates`);

        // ✅ DELETE all existing restrictions for this issuer (REPLACE pattern)
        updateProgress('Deleting old restrictions', 'Preparing to replace with new restrictions...');
        console.log(`🗑️  Deleting all existing restrictions for issuer ${issuerId}...`);

        const deleteRes = await fetch(`/api/restriction-templates?issuerId=${issuerId}`, {
          method: "DELETE",
        });

        if (!deleteRes.ok) {
          console.warn("⚠️  Failed to delete existing restrictions:", await deleteRes.text());
        } else {
          console.log("✅ Old restrictions deleted successfully");
        }

        // ✅ INSERT new restrictions
        console.log(`📋 Saving ${deduplicatedRestrictions.length} new restriction templates...`);

        await postMany(deduplicatedRestrictions, "/api/restriction-templates", "restrictions", (r) => ({
          restriction_type: r.restriction_code,
          restriction_name: r.restriction_code, // Use code as name if not provided
          description: r.legend_text,
          is_active: true
        }));
      }

      // REPLACE the entire shareholders and transactions section (lines ~420-515) with this:

      // 5) Shareholders -> /api/shareholders (bulk insert) - MUST complete before transactions
      if (formData.shareholders && formData.shareholders.length > 0) {
        // ✅ DEDUPLICATE shareholders by account_number (Recordkeeping Book creates duplicates per transaction)
        const uniqueShareholders = {};
        formData.shareholders.forEach(s => {
          const account = s.account_number;
          if (!account) return;

          // Keep first occurrence or merge data
          if (!uniqueShareholders[account]) {
            uniqueShareholders[account] = s;
          } else {
            // Merge: prefer non-empty values
            const existing = uniqueShareholders[account];
            uniqueShareholders[account] = {
              ...existing,
              first_name: existing.first_name || s.first_name,
              last_name: existing.last_name || s.last_name,
              address: existing.address || s.address,
              city: existing.city || s.city,
              state: existing.state || s.state,
              zip: existing.zip || s.zip,
              country: existing.country || s.country,
              taxpayer_id: existing.taxpayer_id || s.taxpayer_id,
              email: existing.email || s.email,
              phone: existing.phone || s.phone,
              holder_type: existing.holder_type || s.holder_type,
            };
          }
        });

        const deduplicatedShareholders = Object.values(uniqueShareholders);
        console.log(`📊 Deduplicated ${formData.shareholders.length} shareholders to ${deduplicatedShareholders.length} unique accounts`);

        updateProgress('Creating shareholders', `Bulk inserting ${deduplicatedShareholders.length} accounts`);

        const shPayload = deduplicatedShareholders.map((s) => ({
          issuer_id: issuerId, // ✅ Uses issuer_id from step 1
          account_number: s.account_number || null,
          first_name: s.first_name || null,
          last_name: s.last_name || null,
          address: s.address || null,
          city: s.city || null,
          state: s.state || null,
          zip: s.zip || null,
          country: s.country || null,
          taxpayer_id: s.taxpayer_id || null,
          tin_status: s.tin_status || null,
          email: s.email || null,
          phone: s.phone || null,
          dob: s.dob || null,
          holder_type: s.holder_type || null,
          lei: s.lei || null,
          ofac_date: s.ofac_date || null,
        }));

        const res = await fetch("/api/shareholders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(shPayload),
        });

        const shRes = await res.json().catch(() => ({}));
        console.log("Shareholders API response:", res.status, shRes);

        if (!res.ok) {
          console.warn("Shareholders bulk insert failed", shRes);
          results.shareholders.failed.push({ status: res.status, body: shRes });
        } else {
          // ✅ API returns data directly as array, not wrapped in { records: [] }
          const shareholdersData = Array.isArray(shRes) ? shRes : [];
          results.shareholders.ok = shareholdersData.length;

          // ✅ Build account_number → shareholder_id mapping from DB response
          const accountToShareholderMap = {};
          shareholdersData.forEach((sh) => {
            if (sh.account_number && sh.id) {
              accountToShareholderMap[sh.account_number] = sh.id;
            }
          });

          console.log("📊 Account to Shareholder mapping:", accountToShareholderMap);

          // ✅ Update state for UI display
          setShareholderMap(
            Object.fromEntries(
              Object.entries(accountToShareholderMap).map(([account, id]) => [
                account,
                {
                  id,
                  name: shareholdersData.find(r => r.id === id) ?
                    `${shareholdersData.find(r => r.id === id).first_name || ""} ${shareholdersData.find(r => r.id === id).last_name || ""}`.trim() :
                    "Unknown"
                }
              ])
            )
          );

          // 6) Transactions -> /api/recordkeeping/transactions (AFTER shareholders are saved)
          if (formData.transactions && formData.transactions.length > 0) {
            const txPayload = formData.transactions.map((t) => ({
              issuer_id: issuerId, // ✅ Uses issuer_id from step 1
              issue_name: t.issue_name || null,
              issue_ticker: t.issue_ticker || null,
              trading_platform: t.trading_platform || null,
              cusip: t.cusip || null,
              security_type: t.security_type || null,
              issuance_type: t.issuance_type || null,

              // ✅ Map shareholder_account → shareholder_id using fresh mapping
              shareholder_id: t.shareholder_account && accountToShareholderMap[t.shareholder_account]
                ? accountToShareholderMap[t.shareholder_account]
                : null,

              shareholder_account: t.shareholder_account || null,
              transaction_type: t.transaction_type || null,
              credit_debit: t.credit_debit || null,
              transaction_date: t.transaction_date || null,
              share_quantity: Number(t.share_quantity || 0),
              certificate_type: t.certificate_type || null,
              status: t.status || null,
              notes: t.notes || "NIL",
              raw_row: t._raw || null,
            }));

            console.log("Transactions payload sample:", {
              total: txPayload.length,
              sample: txPayload[0],
              mappingCount: Object.keys(accountToShareholderMap).length
            });

            updateProgress('Creating transactions', `Bulk inserting ${txPayload.length} records`);

            const txRes = await fetch("/api/recordkeeping/transactions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(txPayload),
            });

            const txResBody = await txRes.json().catch(() => ({}));
            console.log("Transactions API response:", txRes.status, txResBody);

            if (!txRes.ok) {
              console.warn("Transactions bulk insert failed", txResBody);
              results.transactions.failed.push({
                status: txRes.status,
                body: txResBody,
              });
            } else {
              results.transactions.ok = txPayload.length;

              // 6b) Create shareholder positions by calculating from imported transactions
              // ✅ Use the cusipToSecurityMap we built during securities creation (avoids HTTP cache issues)
              if (formData.transactions && formData.transactions.length > 0 && formData.securities && formData.securities.length > 0) {
                console.log("📊 Using CUSIP to Security mapping from creation:", cusipToSecurityMap);

                // Calculate position for each shareholder+security combination
                const positions = {}; // key: "shareholderId|securityId", value: { ... }

                formData.transactions.forEach(tx => {
                  const shareholderId = tx.shareholder_account && accountToShareholderMap[tx.shareholder_account]
                    ? accountToShareholderMap[tx.shareholder_account]
                    : null;

                  const securityId = tx.cusip && cusipToSecurityMap[tx.cusip]
                    ? cusipToSecurityMap[tx.cusip]
                    : null;

                  if (!shareholderId || !securityId) return;

                  const key = `${shareholderId}|${securityId}`;
                  if (!positions[key]) {
                    positions[key] = {
                      shareholderId,
                      securityId,
                      balance: 0,
                      lastTransactionDate: null // Track latest date
                    };
                  }

                  // Determine if credit (add) or debit (subtract)
                  // CRITICAL FIX: Use absolute value to handle Excel files that already have negative values for debits
                  let multiplier = 1;
                  if (tx.credit_debit) {
                    const cdStr = String(tx.credit_debit).toLowerCase().trim();
                    if (cdStr.includes('debit') || cdStr.includes('withdrawal')) {
                      multiplier = -1;
                    }
                  }

                  // Use Math.abs() to handle both formats:
                  // 1. Excel files with signed values (e.g., -255190 for debits)
                  // 2. Manual entries with unsigned values that rely on credit_debit column
                  positions[key].balance += Math.abs(tx.share_quantity || 0) * multiplier;

                  // Update last transaction date
                  if (tx.transaction_date) {
                    const txDate = new Date(tx.transaction_date);
                    const currentMax = positions[key].lastTransactionDate ? new Date(positions[key].lastTransactionDate) : null;

                    if (!currentMax || txDate > currentMax) {
                      positions[key].lastTransactionDate = tx.transaction_date;
                    }
                  }
                });

                // Create position records for positive balances
                const positionsPayload = Object.values(positions)
                  .filter(pos => pos.balance > 0)
                  .map(pos => ({
                    issuer_id: issuerId,
                    shareholder_id: pos.shareholderId,
                    security_id: pos.securityId,
                    shares_owned: pos.balance,
                    // Use the latest transaction date, or fallback to today if missing
                    position_date: pos.lastTransactionDate || new Date().toISOString().split('T')[0],
                  }));

                if (positionsPayload.length > 0) {
                  updateProgress('Creating shareholder positions', `${positionsPayload.length} positions`);

                  const posRes = await fetch("/api/shareholder-positions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify(positionsPayload),
                  });

                  const posResBody = await posRes.json().catch(() => ({}));
                  console.log("Shareholder positions API response:", posRes.status, posResBody);
                }
              }
            }
          }
        }
      }

      // 7) Recordkeeping summary -> /api/recordkeeping (can run in parallel)
      await postMany(formData.recordkeeping || [], "/api/recordkeeping", "recordkeeping");




      // 8) Documents reference (one call) -> /api/documents
      updateProgress('Finalizing import', 'Creating document reference');

      try {
        const docRes = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            issuer_id: issuerId,
            document_type: "import_excel",
            document_name: "Imported File",
            file_url: "/uploads/fake.xlsx",
            file_size: 12345,
            file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        });
        const docBody = await docRes.json().catch(() => ({}));
        console.log("Documents API response:", docRes.status, docBody);
      } catch (err) {
        console.warn("Documents API error:", err);
      }

      // --- Build result message ---
      // --- Build result message ---
      const failures = [
        ...results.splits.failed,
        ...results.securities.failed,
        ...results.officers.failed,
        ...results.shareholders.failed,
        ...results.recordkeeping.failed,
        ...results.transactions.failed,
      ];

      // Filter out entities with 0 records
      const addedRecords = [];
      if (results.splits.ok > 0) addedRecords.push(`Splits: ${results.splits.ok}`);
      if (results.securities.ok > 0) addedRecords.push(`Securities: ${results.securities.ok}`);
      if (results.officers.ok > 0) addedRecords.push(`Officers: ${results.officers.ok}`);
      if (results.shareholders.ok > 0) addedRecords.push(`Shareholders: ${results.shareholders.ok}`);
      if (results.recordkeeping.ok > 0) addedRecords.push(`Records: ${results.recordkeeping.ok}`);
      if (results.transactions.ok > 0) addedRecords.push(`Transactions: ${results.transactions.ok}`);

      // Store issuerId in ref and start redirect timer
      savedIssuerIdRef.current = issuerId;
      setRedirectCountdown(5);

      const startRedirectTimer = () => {
        let count = 5;
        redirectTimerRef.current = setInterval(() => {
          count -= 1;
          setRedirectCountdown(count);
          if (count <= 0) {
            clearInterval(redirectTimerRef.current);
            window.location.href = `/issuer/${savedIssuerIdRef.current}/record-keeping`;
          }
        }, 1000);
      };

      if (failures.length > 0) {
        console.warn("Some items failed to save:", failures);
        setSaveProgress('complete');
        setSaveResults({
          type: 'warning',
          message: 'Import completed with some errors',
          addedRecords,
          note: 'Check console for failed rows (detailed).'
        });
        startRedirectTimer();
      } else {
        setSaveProgress('complete');
        setSaveResults({
          type: 'success',
          message: 'All data saved successfully!',
          addedRecords
        });
        startRedirectTimer();
      }
    } catch (err) {
      console.error("Save flow error:", err);
      setSaveProgress('error');
      setSaveResults({ type: 'error', message: 'Save failed — check console for details.' });

    } finally {
      setLoading(false);
    }
  };

  // --- Tabs list with metadata -----------------------------------------------------------
  const tabs = [
    {
      key: "issuer",
      label: "Issuer Info",
      description: "Company details",
      count: formData ? 1 : 0,
    },
    {
      key: "securities",
      label: "Securities",
      description: "CUSIPs & share classes",
      count: formData?.securities?.length || 0,
    },
    {
      key: "officers",
      label: "Officers",
      description: "Directors & officers",
      count: formData?.officers?.length || 0,
    },
    {
      key: "restrictions",
      label: "Restrictions",
      description: "Legend codes",
      count: formData?.restrictions?.length || 0,
    },
    {
      key: "shareholders",
      label: "Shareholders",
      description: "Account holders",
      count: formData?.shareholders?.length || 0,
    },
    {
      key: "transactions",
      label: "Transactions",
      description: "Transaction history",
      count: formData?.transactions?.length || 0,
      warnings: validationWarnings?.emptyTransactionTypes?.length || 0,
    },
  ];

  // Unified Import Modal - handles saving, complete, error, and conflict states
  const ImportModal = memo(function ImportModal({
    state, // 'saving' | 'complete' | 'conflict'
    progress,
    results,
    conflict,
    countdown, // Countdown value passed from parent
    onClose,
    onOverride,
    onCancel
  }) {
    const progressPercentage = progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

    const isComplete = state === 'complete';
    const isConflict = state === 'conflict';
    const isError = results?.type === 'error';
    const isSuccess = results?.type === 'success';
    const isWarning = results?.type === 'warning';

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-2xl shadow-2xl p-8 max-w-lg w-full">

          {/* CONFLICT STATE */}
          {isConflict && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="text-center mb-6">
                <h3 className="font-bold text-2xl text-foreground mb-2">Issuer Already Exists</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{conflict?.issuer_name || conflict?.display_name}</span> already exists.
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300 text-sm mb-2">This will DELETE all existing data</p>
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                      <li>• All Securities & Shareholders</li>
                      <li>• All Transactions & Records</li>
                      <li>• All Officers & Split Events</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={onCancel} className="px-6 rounded-xl">Cancel</Button>
                <Button onClick={onOverride} className="px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                  Override & Replace
                </Button>
              </div>
            </>
          )}

          {/* SAVING STATE */}
          {state === 'saving' && (
            <>
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20"></div>
                  <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-primary"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Importing Data</h3>
                  <p className="text-sm text-foreground/70">Please wait while we process your file</p>
                </div>
              </div>
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-wealth-gradient animate-pulse"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">{progress.step}</p>
                    {progress.details && <p className="text-xs text-foreground/60">{progress.details}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/70 font-medium">Progress</span>
                  <span className="text-primary font-bold text-lg">{progressPercentage}%</span>
                </div>
                <div className="relative w-full bg-muted rounded-full h-3 overflow-hidden border border-border/50">
                  <div
                    className="bg-wealth-gradient h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* COMPLETE STATE */}
          {isComplete && (
            <>
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isError ? 'bg-red-500/10' : isWarning ? 'bg-yellow-500/10' : 'bg-green-500/10'
                }`}>
                  {isError ? (
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : isWarning ? (
                    <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className={`text-2xl font-bold ${isError ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500'}`}>
                    {isError ? 'Import Failed' : isWarning ? 'Completed with Warnings' : 'Import Successful!'}
                  </h3>
                  <p className="text-sm text-foreground/70">{results?.message}</p>
                </div>
              </div>

              {results?.addedRecords?.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50 mb-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Import Summary:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {results.addedRecords.map((record, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-foreground/80">{record}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results?.note && <p className="text-sm text-muted-foreground mb-4 px-1">{results.note}</p>}

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/70 font-medium">Completed</span>
                  <span className="text-green-500 font-bold text-lg">100%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border/50">
                  <div className="bg-green-500 h-3 rounded-full w-full"></div>
                </div>
              </div>

              {(isSuccess || isWarning) && savedIssuerIdRef.current && (
                <div className="mt-6 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground/70">Redirecting to Record Keeping...</p>
                    <span className="text-lg font-bold text-primary">{countdown}s</span>
                  </div>
                  <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(countdown / 5) * 100}%` }} />
                  </div>
                </div>
              )}

              {isError && (
                <button
                  onClick={onClose}
                  className="mt-6 w-full py-2 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  });

  {/*// Results Modal
<div className="px-6 py-4">
  {results.addedRecords && results.addedRecords.length > 0 && (
    <div className="space-y-2 mb-4">
      <p className="text-sm font-medium text-gray-700">Added records:</p>
      <div className="text-sm space-y-1">
        {results.addedRecords.map((record, index) => (
          <div key={index} className="text-gray-600">• {record}</div>
        ))}
      </div>
    </div>
  )}
  
  {results.note && (
    <p className="text-sm text-gray-600 mb-4">{results.note}</p>
  )}
  
  <div className="flex justify-end">
    <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2">
      Close
    </Button>
  </div>
</div>

*/}

  return (
    <div className="space-y-6">
      {/* Premium Drag & Drop File Upload */}
      {!formData && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden
            ${isDragOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }
          `}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full transition-all duration-500 ${isDragOver ? 'bg-primary/10' : 'bg-primary/5'}`} />
            <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full transition-all duration-500 ${isDragOver ? 'bg-primary/10' : 'bg-primary/5'}`} />
          </div>

          <div className="relative py-16 px-8 flex flex-col items-center justify-center text-center">
            {/* Icon */}
            <div className={`
              relative mb-6 transition-transform duration-300
              ${isDragOver ? 'scale-110' : ''}
            `}>
              <div className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-300 ${isDragOver ? 'bg-primary/30' : 'bg-primary/10'}`} />
              <div className="relative p-5 rounded-2xl bg-wealth-gradient shadow-lg">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <h3 className={`text-xl font-bold mb-2 transition-colors ${isDragOver ? 'text-primary' : 'text-foreground'}`}>
              {isDragOver ? 'Drop your file here' : 'Drag & drop your spreadsheet'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Upload an Excel file containing issuer data, shareholders, securities, and transaction history
            </p>

            {/* Button */}
            <div className="flex items-center space-x-4">
              <span className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg">
                Browse Files
              </span>
              <span className="text-sm text-muted-foreground">or drag here</span>
            </div>

            {/* File types */}
            <div className="flex items-center space-x-3 mt-6">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
                <svg className="w-4 h-4 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                .xlsx
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
                <svg className="w-4 h-4 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                .xls
              </span>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Data Preview Section */}
      {formData && (
        <>
          {/* File loaded indicator */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">File loaded successfully</p>
                <p className="text-xs text-green-600 dark:text-green-400">Review and edit data below before importing</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFormData(null);
                setValidationWarnings(null);
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Upload Different File
            </button>
          </div>

          {/* Premium Tabs Navigation */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="inline-flex items-center space-x-1 p-1.5 rounded-xl bg-muted/50 border border-border min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative px-5 py-3 rounded-lg transition-all duration-200 min-w-[130px] text-left
                    ${activeTab === tab.key
                      ? "bg-background text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between space-x-3">
                    <div>
                      <span className="font-semibold text-sm block">{tab.label}</span>
                      <span className={`text-xs ${activeTab === tab.key ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
                        {tab.description}
                      </span>
                    </div>
                    <span className={`
                      inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-bold rounded-full transition-colors
                      ${activeTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }
                    `}>
                      {tab.count}
                    </span>
                  </div>
                  {tab.warnings > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                      {tab.warnings}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Validation Alerts */}
          {hasValidationErrors && (
            <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Data Issues Found</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {validationWarnings?.emptyTransactionTypes?.length > 0 && (
                  <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                    {validationWarnings.emptyTransactionTypes.length} missing type
                  </span>
                )}
                {validationWarnings?.missingDates?.length > 0 && (
                  <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    {validationWarnings.missingDates.length} missing date
                  </span>
                )}
                {validationWarnings?.missingShareholders?.length > 0 && (
                  <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {validationWarnings.missingShareholders.length} missing account
                  </span>
                )}
                {validationWarnings?.zeroQuantities?.length > 0 && (
                  <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {validationWarnings.zeroQuantities.length} zero qty
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveTab("transactions")}
                className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap"
              >
                View Transactions →
              </button>
            </div>
          )}

          {/* Content Area - Premium Card */}
          <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
            <div className="p-6 min-h-[400px]">
              {activeTab === "issuer" && (
                <IssuerForm issuer={formData.issuer} setIssuer={(u) => updateSection("issuer", u)} />
              )}
              {activeTab === "splits" && (
                <SplitsForm splits={formData.splits} setSplits={(s) => updateSection("splits", s)} />
              )}
              {activeTab === "securities" && (
                <SecuritiesForm securities={formData.securities} setSecurities={(s) => updateSection("securities", s)} />
              )}
              {activeTab === "officers" && (
                <OfficersForm officers={formData.officers} setOfficers={(o) => updateSection("officers", o)} />
              )}
              {activeTab === "restrictions" && (
                <RestrictionsForm restrictions={formData.restrictions} setRestrictions={(r) => updateSection("restrictions", r)} />
              )}
              {activeTab === "shareholders" && (
                <ShareholdersForm shareholders={formData.shareholders} setShareholders={(s) => updateSection("shareholders", s)} />
              )}
              {activeTab === "recordkeeping" && (
                <RecordkeepingBookForm records={formData.recordkeeping} setRecords={(rk) => updateSection("recordkeeping", rk)} />
              )}
              {activeTab === "transactions" && (
                <RecordkeepingTransactionsForm
                  transactions={formData.transactions.map((t) => ({
                    ...t,
                    // ✅ Use toDBDate for consistent YYYY-MM-DD format (locale-independent)
                    transaction_date: t.transaction_date instanceof Date
                      ? toDBDate(t.transaction_date)
                      : t.transaction_date,
                    shareholder_name:
                      t.shareholder_account && shareholderMap[t.shareholder_account]
                        ? shareholderMap[t.shareholder_account].name
                        : "Unmapped",
                    shareholder_id:
                      t.shareholder_account && shareholderMap[t.shareholder_account]
                        ? shareholderMap[t.shareholder_account].id
                        : null,
                  }))}
                  setTransactions={(tx) => updateSection("transactions", tx)}
                />
              )}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex-1">
              {hasValidationErrors && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="p-1.5 rounded-full bg-destructive/10">
                    <svg className="w-4 h-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-destructive font-medium">Fix or delete rows with errors to continue</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-6 border-border hover:bg-muted text-foreground rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveIssuerAndRelated(false)}
                className="px-8 bg-wealth-gradient text-black font-bold hover:opacity-90 rounded-xl shadow-lg hover:shadow-xl transition-all"
                disabled={loading || hasValidationErrors}
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>Import All Data</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </Button>
            </div>
          </div>

        </>
      )}
      {/* Progress Indicator */}
      {/* Unified Import Modal */}
      {(saveProgress === 'saving' || saveProgress === 'complete' || conflictData) && (
        <ImportModal
          state={conflictData ? 'conflict' : saveProgress}
          progress={progressStep}
          results={saveResults}
          conflict={conflictData}
          countdown={redirectCountdown}
          onClose={() => {
            setSaveResults(null);
            setSaveProgress(null);
            if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
          }}
          onOverride={() => {
            setConflictData(null);
            saveIssuerAndRelated(true);
          }}
          onCancel={() => {
            setConflictData(null);
            onClose();
          }}
        />
      )}

      {/* Results Modal - Now integrated into ProgressIndicator */}


      {/* Removed large validation modal - now using inline warning banner */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-bold text-2xl">Data Validation Warnings</h3>
                  <p className="text-orange-100 text-sm mt-1">
                    We found {(validationWarnings.emptyTransactionTypes.length +
                      validationWarnings.missingDates.length +
                      validationWarnings.zeroQuantities.length +
                      validationWarnings.missingShareholders.length +
                      validationWarnings.missingCUSIPs.length)} issues that need your attention
                  </p>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {validationWarnings.emptyTransactionTypes.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-red-600">{validationWarnings.emptyTransactionTypes.length}</div>
                    <div className="text-sm text-red-700 mt-1">Missing Transaction Types</div>
                  </div>
                )}
                {validationWarnings.missingDates.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-orange-600">{validationWarnings.missingDates.length}</div>
                    <div className="text-sm text-orange-700 mt-1">Missing Dates</div>
                  </div>
                )}
                {validationWarnings.zeroQuantities.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-yellow-600">{validationWarnings.zeroQuantities.length}</div>
                    <div className="text-sm text-yellow-700 mt-1">Zero Quantities</div>
                  </div>
                )}
                {validationWarnings.missingShareholders.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">{validationWarnings.missingShareholders.length}</div>
                    <div className="text-sm text-purple-700 mt-1">Missing Shareholders</div>
                  </div>
                )}
                {validationWarnings.missingCUSIPs.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">{validationWarnings.missingCUSIPs.length}</div>
                    <div className="text-sm text-blue-700 mt-1">Missing CUSIPs</div>
                  </div>
                )}
              </div>

              {/* Detailed Warnings */}
              {validationWarnings.emptyTransactionTypes.length > 0 && (
                <div className="bg-white border border-red-200 rounded-lg">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <h4 className="font-semibold text-red-900 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Missing Transaction Types ({validationWarnings.emptyTransactionTypes.length} rows)
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      These transactions are missing or have "UNKNOWN" transaction types
                    </p>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Account</th>
                          <th className="px-3 py-2 text-left">CUSIP</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {validationWarnings.emptyTransactionTypes.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{item.row}</td>
                            <td className="px-3 py-2 font-mono text-xs">{item.account}</td>
                            <td className="px-3 py-2 font-mono text-xs">{item.cusip}</td>
                            <td className="px-3 py-2 text-xs">{item.date}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationWarnings.emptyTransactionTypes.length > 10 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        ... and {validationWarnings.emptyTransactionTypes.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-900 font-semibold">What happens if I continue?</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Data with warnings will still be imported, but may cause issues in reporting and compliance.
                      You can fix these in the tabs above or continue anyway.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setShowValidationModal(false)}
                className="border-gray-300 hover:bg-gray-100"
              >
                Review & Fix Data
              </Button>
              <Button
                onClick={() => {
                  setShowValidationModal(false);
                  // Optionally scroll to transactions tab
                  setActiveTab("transactions");
                }}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                I Understand, Continue Anyway →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict modal now integrated into ImportModal above */}
    </div>
  );
}
