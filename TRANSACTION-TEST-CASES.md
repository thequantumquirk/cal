# Transaction Processing - Complete Test Cases

## Test Environment Setup

### Prerequisites:
1. **Issuer:** "Apex Financial SPAC" (or create a test issuer)
2. **Securities created:**
   - Units (CUSIP: APEX-U)
   - Class A shares (CUSIP: APEX-A)
   - Warrants (CUSIP: APEX-W)
3. **Shareholders created:**
   - Cede & Co (DTC account)
   - John Doe (Account #001)
   - Jane Smith (Account #002)
   - ABC Investment LLC (Account #003)

---

## Test Case 1: IPO (Original Issuance)

### Purpose:
Initial issuance of shares from the company to a shareholder

### Input:
```
Transaction Type: IPO (Original Issuance)
Security: Class A shares (APEX-A)
Shareholder: John Doe
Quantity: 10,000
Date: 11/19/2025
Notes: Initial issuance
```

### Expected Database Entry:
```
transfers_new:
- transaction_type: "IPO"
- shareholder_id: john_doe_id
- cusip: "APEX-A"
- share_quantity: 10000 (positive)
- transaction_date: "2025-11-19"
- status: "Active"
```

### Expected Effects:

#### 1. Record Keeping Book (`/issuer/[id]/record-keeping`)
**Transaction Detail Table:**
| Date | CUSIP | Issue Name | Security | Account | Shareholder | Type | Credit/Debit | Quantity |
|------|-------|------------|----------|---------|-------------|------|--------------|----------|
| 11/19/2025 | APEX-A | Apex Financial | Class A | 001 | John Doe | IPO | Credit | 10,000 |

**Outstanding Shares Summary (Top of page):**
| CUSIP | Issue Name | Security Type | Total Outstanding | Total Authorized |
|-------|------------|---------------|-------------------|------------------|
| APEX-A | Apex Financial | Class A | 10,000 | 1,000,000 |

#### 2. Shareholder Positions (`shareholder_positions_new` table)
```
shareholder_positions_new:
- shareholder_id: john_doe_id
- security_id: class_a_security_id
- shares_owned: 10,000
- position_date: "2025-11-19"
```

#### 3. Control Book (if implemented)
Shows John Doe owns 10,000 Class A shares

#### 4. What Should NOT Change:
- Total Authorized shares (remains at 1,000,000)
- Units balance (no change)
- Warrants balance (no change)
- Other shareholders' balances

---

## Test Case 2: DWAC Deposit

### Purpose:
Deposit shares into DTC from transfer agent (usually TO Cede & Co)

### Input:
```
Transaction Type: DWAC Deposit
Security: Class A shares (APEX-A)
Shareholder: Cede & Co
Quantity: 5,000
Date: 11/19/2025
Notes: Deposit to DTC
```

### Expected Database Entry:
```
transfers_new:
- transaction_type: "DWAC Deposit"
- shareholder_id: cede_id
- cusip: "APEX-A"
- share_quantity: 5000 (positive)
- credit_debit: "Credit" (derived)
```

### Expected Effects:

#### 1. Record Keeping Book
**Transaction Detail:**
| Date | CUSIP | Shareholder | Type | Credit/Debit | Quantity |
|------|-------|-------------|------|--------------|----------|
| 11/19/2025 | APEX-A | Cede & Co | DWAC Deposit | Credit | 5,000 |

**Outstanding Shares for APEX-A:**
- Before: 10,000 (from IPO)
- After: 15,000 (10,000 + 5,000)

#### 2. Shareholder Positions
```
Cede & Co:
- Class A: 5,000 shares (NEW)
```

#### 3. What Should NOT Change:
- John Doe's position (still 10,000)
- Other securities' balances

---

## Test Case 3: DWAC Withdrawal (Manual - without Split)

### Purpose:
Withdraw shares from DTC (usually FROM Cede & Co)

### Input:
```
Transaction Type: DWAC Withdrawal
Security: Units (APEX-U)
Shareholder: Cede & Co
Quantity: 1,000
Date: 11/19/2025
Notes: Withdrawal for transfer
```

### Expected Database Entry:
```
transfers_new:
- transaction_type: "DWAC Withdrawal"
- shareholder_id: cede_id
- cusip: "APEX-U"
- share_quantity: 1000 (positive)
- credit_debit: "Debit" (derived)
```

### Expected Effects:

#### 1. Record Keeping Book
**Transaction Detail:**
| Date | CUSIP | Shareholder | Type | Credit/Debit | Quantity |
|------|-------|-------------|------|--------------|----------|
| 11/19/2025 | APEX-U | Cede & Co | DWAC Withdrawal | Debit | 1,000 |

**Outstanding Shares Calculation:**
If Cede had 5,000 Units before:
- Before: 5,000 Units
- After: 4,000 Units (5,000 - 1,000)

#### 2. Shareholder Positions
```
Cede & Co:
- Units: 4,000 shares (was 5,000, now reduced by 1,000)
```

#### 3. What Changes:
- ✅ Cede's Units balance DECREASES by 1,000
- ✅ Total outstanding Units DECREASES by 1,000
- ❌ NO Class A or Warrants created (this is just withdrawal, not split)

---

## Test Case 4: Split (Units → Class A + Warrants)

### Purpose:
Automatically split Units into Class A shares and Warrants

### Input:
```
Transaction Type: Split (Units → Class A + Warrants)
Security: Units (APEX-U)
Shareholder: John Doe
Quantity: 1,000 Units
Date: 11/19/2025
Notes: Unit split request
```

### Auto-Calculated (assuming 1:1 ratios):
- Class A: 1,000 shares
- Warrants: 1,000 warrants

### Expected Database Entries (3 transactions):

**Transaction 1: Debit Units**
```
transfers_new:
- transaction_type: "DWAC Withdrawal"
- shareholder_id: john_doe_id
- cusip: "APEX-U"
- share_quantity: 1000 (positive, but treated as debit)
- notes: "Split transaction - Debit Units"
```

**Transaction 2: Credit Class A**
```
transfers_new:
- transaction_type: "DWAC Deposit"
- shareholder_id: john_doe_id
- cusip: "APEX-A"
- share_quantity: 1000 (positive)
- notes: "Split transaction - Credit Class A"
```

**Transaction 3: Credit Warrants**
```
transfers_new:
- transaction_type: "DWAC Deposit"
- shareholder_id: john_doe_id
- cusip: "APEX-W"
- share_quantity: 1000 (positive)
- notes: "Split transaction - Credit Warrants"
```

### Expected Effects:

#### 1. Record Keeping Book
**Transaction Detail (3 rows created):**
| Date | CUSIP | Shareholder | Type | Credit/Debit | Quantity | Notes |
|------|-------|-------------|------|--------------|----------|-------|
| 11/19/2025 | APEX-U | John Doe | DWAC Withdrawal | Debit | 1,000 | Split transaction - Debit Units |
| 11/19/2025 | APEX-A | John Doe | DWAC Deposit | Credit | 1,000 | Split transaction - Credit Class A |
| 11/19/2025 | APEX-W | John Doe | DWAC Deposit | Credit | 1,000 | Split transaction - Credit Warrants |

**Outstanding Shares Summary Changes:**
| CUSIP | Before | Transaction | After |
|-------|--------|-------------|-------|
| APEX-U | 5,000 | -1,000 (Debit) | 4,000 |
| APEX-A | 15,000 | +1,000 (Credit) | 16,000 |
| APEX-W | 0 | +1,000 (Credit) | 1,000 |

#### 2. Shareholder Positions (3 updates)
```
John Doe:
- Units: Decreases by 1,000 (e.g., 2,000 → 1,000)
- Class A: Increases by 1,000 (e.g., 10,000 → 11,000)
- Warrants: Increases by 1,000 (e.g., 0 → 1,000)
```

#### 3. Toast Notification
Shows: "Split transaction processed successfully! Created 3 transactions."
With button: "View Record Book"

#### 4. What Should NOT Change:
- Other shareholders' balances
- Total authorized shares

---

## Test Case 5: Transfer Debit

### Purpose:
Manually debit (remove) shares from a shareholder (typically part of shareholder-to-shareholder transfer)

### Input:
```
Transaction Type: Transfer Debit
Security: Class A shares (APEX-A)
Shareholder: John Doe
Quantity: 500
Date: 11/19/2025
Notes: Transfer to Jane Smith
```

### Expected Database Entry:
```
transfers_new:
- transaction_type: "Transfer Debit"
- shareholder_id: john_doe_id
- cusip: "APEX-A"
- share_quantity: 500 (positive)
- credit_debit: "Debit" (derived)
```

### Expected Effects:

#### 1. Record Keeping Book
**Transaction Detail:**
| Date | CUSIP | Shareholder | Type | Credit/Debit | Quantity |
|------|-------|-------------|------|--------------|----------|
| 11/19/2025 | APEX-A | John Doe | Transfer Debit | Debit | 500 |

**Outstanding Shares for APEX-A:**
- Total does NOT change (shares just moved between shareholders)
- Still 16,000 total outstanding

#### 2. Shareholder Positions
```
John Doe:
- Class A: Decreases by 500 (e.g., 11,000 → 10,500)
```

#### 3. What Should NOT Change:
- Total outstanding shares (same total, different ownership)
- Jane Smith's balance (she hasn't received the credit yet)

**IMPORTANT:** You must also create a Transfer Credit to Jane Smith to complete the transfer!

---

## Test Case 6: Transfer Credit

### Purpose:
Manually credit (add) shares to a shareholder (typically part of shareholder-to-shareholder transfer)

### Input:
```
Transaction Type: Transfer Credit
Security: Class A shares (APEX-A)
Shareholder: Jane Smith
Quantity: 500
Date: 11/19/2025
Notes: Transfer from John Doe
```

### Expected Database Entry:
```
transfers_new:
- transaction_type: "Transfer Credit"
- shareholder_id: jane_smith_id
- cusip: "APEX-A"
- share_quantity: 500 (positive)
- credit_debit: "Credit" (derived)
```

### Expected Effects:

#### 1. Record Keeping Book
**Transaction Detail:**
| Date | CUSIP | Shareholder | Type | Credit/Debit | Quantity |
|------|-------|-------------|------|--------------|----------|
| 11/19/2025 | APEX-A | Jane Smith | Transfer Credit | Credit | 500 |

**Outstanding Shares for APEX-A:**
- Still 16,000 total (unchanged)

#### 2. Shareholder Positions
```
Jane Smith:
- Class A: Increases by 500 (e.g., 0 → 500)
```

#### 3. Complete Transfer Result:
After both Transfer Debit (Test Case 5) and Transfer Credit (Test Case 6):
- John Doe: Lost 500 shares (11,000 → 10,500)
- Jane Smith: Gained 500 shares (0 → 500)
- Total outstanding: Unchanged (16,000)

---

## Summary Test Matrix

### Transaction Types vs Effects:

| Transaction Type | Creates Transactions | Shareholder Balance | Total Outstanding | Position Update |
|------------------|---------------------|---------------------|-------------------|-----------------|
| IPO | 1 (Credit) | ↑ Increases | ↑ Increases | ✅ Yes |
| DWAC Deposit | 1 (Credit) | ↑ Increases | ↑ Increases | ✅ Yes |
| DWAC Withdrawal | 1 (Debit) | ↓ Decreases | ↓ Decreases | ✅ Yes |
| Split | 3 (1 Debit, 2 Credits) | Units ↓, Class A ↑, Warrants ↑ | All 3 securities change | ✅ Yes (3 securities) |
| Transfer Debit | 1 (Debit) | ↓ Decreases (seller) | No change | ✅ Yes |
| Transfer Credit | 1 (Credit) | ↑ Increases (buyer) | No change | ✅ Yes |

---

## Where to Check Each Effect

### 1. Transaction Was Created
**Location:** Database directly OR Record Keeping Book
```
Path: /issuer/[issuerId]/record-keeping
Check: Transaction Detail Table (bottom of page)
```

### 2. Shareholder Balance Updated
**Location:** Shareholder Positions table OR Control Book
```
Database: shareholder_positions_new table
UI Path: /issuer/[issuerId]/control-book (if implemented)
```

### 3. Outstanding Shares Total
**Location:** Record Keeping Book - Top Summary
```
Path: /issuer/[issuerId]/record-keeping
Check: "Current Outstanding Shares by CUSIP" table (top of page)
```

### 4. Toast Notification
**Location:** Transaction Processing page
```
Path: /issuer/[issuerId]/transaction-processing
Check: Success toast appears with "View Record Book" button
```

---

## Complete Test Scenario (All Cases Combined)

### Initial State:
- Apex Financial SPAC created
- 3 securities created (Units, Class A, Warrants)
- 3 shareholders created (Cede, John, Jane)
- All balances = 0

### Test Sequence:

**Step 1: IPO to John Doe**
```
IPO: 10,000 Class A to John Doe
Expected: John = 10,000 Class A
```

**Step 2: DWAC Deposit to Cede**
```
DWAC Deposit: 5,000 Class A to Cede & Co
Expected: Cede = 5,000 Class A
Total Class A Outstanding = 15,000
```

**Step 3: IPO Units to John**
```
IPO: 2,000 Units to John Doe
Expected: John = 2,000 Units, 10,000 Class A
```

**Step 4: Split Units for John**
```
Split: 1,000 Units for John Doe
Expected:
- John Units: 2,000 → 1,000
- John Class A: 10,000 → 11,000
- John Warrants: 0 → 1,000
- 3 transactions created
```

**Step 5: Transfer from John to Jane**
```
5a. Transfer Debit: 500 Class A from John
Expected: John Class A: 11,000 → 10,500

5b. Transfer Credit: 500 Class A to Jane
Expected: Jane Class A: 0 → 500
```

**Step 6: DWAC Withdrawal from Cede**
```
DWAC Withdrawal: 1,000 Class A from Cede
Expected: Cede Class A: 5,000 → 4,000
Total Class A Outstanding: 15,000 → 14,000
```

### Final Expected Balances:
```
John Doe:
- Units: 1,000
- Class A: 10,500
- Warrants: 1,000

Cede & Co:
- Units: 0
- Class A: 4,000
- Warrants: 0

Jane Smith:
- Units: 0
- Class A: 500
- Warrants: 0

Total Outstanding:
- Units: 1,000
- Class A: 15,000 (John 10,500 + Cede 4,000 + Jane 500)
- Warrants: 1,000
```

---

## Bug Verification Checklist

After running all test cases, verify these bugs are fixed:

### ✅ Bug #1 Fixed: Share quantity signs
- [ ] Split debit shows positive quantity in database
- [ ] Units are removed (not added) after split

### ✅ Bug #2 Fixed: Position calculation
- [ ] Debit transactions decrease balances
- [ ] Credit transactions increase balances
- [ ] Verify with Transfer Debit (should decrease, not increase)

### ✅ Bug #3 Fixed: Split position updates
- [ ] After split, Units balance decreased
- [ ] After split, Class A balance increased
- [ ] After split, Warrants balance increased

### ✅ Bug #4 Fixed: User notification
- [ ] Toast appears after transaction
- [ ] "View Record Book" button works
- [ ] Clicking button navigates to record-keeping page

---

## Common Issues to Watch For

### Issue 1: Negative Balances
**Problem:** Shareholder balance goes negative
**Cause:** Debit without sufficient shares
**Check:** Always verify shareholder has enough shares before Transfer Debit or DWAC Withdrawal

### Issue 2: Split Doesn't Find Securities
**Problem:** Error: "Class A security not found"
**Cause:** Security doesn't have "class a" in class_name field
**Fix:** Ensure securities have proper class_name values

### Issue 3: Outstanding Total Doesn't Match Sum
**Problem:** Total outstanding ≠ sum of all shareholder balances
**Cause:** Missing position update or calculation bug
**Check:** Sum all shareholder balances manually and compare to total

### Issue 4: Transactions Not Showing
**Problem:** Transaction processed but doesn't appear in Record Book
**Cause:** SWR cache not updated
**Fix:** Click "View Record Book" button or manually refresh page

---

## Quick Test Script

Run this quick test to verify all fixes:

```
1. Create IPO: 1,000 Class A to John ✓
2. Check John's balance = 1,000 ✓
3. Create Transfer Debit: 100 Class A from John ✓
4. Check John's balance = 900 (NOT 1,100!) ✓
5. Create Split: 500 Units for John ✓
6. Check 3 transactions created ✓
7. Check John's Units decreased by 500 ✓
8. Check John's Class A increased by 500 ✓
9. Check John's Warrants increased by 500 ✓
10. Click "View Record Book" button ✓
```

If all 10 steps pass, all bugs are fixed! ✅
