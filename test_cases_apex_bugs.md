# APEX Units Calculation Bug - Test Cases

## Background
Doug reported Units outstanding showing **18,053,656** instead of expected **7,886,132** after a DWAC Deposit of 2,500 units to Cede.

Two potential root causes identified:
1. **Sign Mismatch Bug**: DWAC Withdrawal transactions stored with positive values instead of negative
2. **DWAC Deposit Behavior Bug**: System might be miscalculating when processing DWAC Deposit transactions

---

## Bug 1: Sign Mismatch in DWAC Withdrawal Transactions

### Description
When split transactions were manually entered as "DWAC Withdrawal" type, the quantities were stored as **positive** values when they should be **negative** (shares leaving custody).

### Evidence Found
```
DB DWAC Withdrawals (before fix):
  2025-12-04 | G04104116 | qty: +960,000  ← WRONG (should be -960,000)
  2025-12-04 | G04104116 | qty: +400,000  ← WRONG
  2025-12-04 | G04104116 | qty: +250,000  ← WRONG
  ... (17 transactions total with wrong sign)
```

### Impact Calculation
- Wrong positive sum: +5,093,762
- Should have been: -5,093,762
- Net error: 10,187,524 (difference of 2x the amount)

### Test Case 1.1: Verify DWAC Withdrawal Sign on Entry
**Steps:**
1. Navigate to APEX issuer → Transactions
2. Add new transaction:
   - Type: "DWAC Withdrawal"
   - CUSIP: G04104116 (Units)
   - Quantity: 1000 (enter as positive)
   - Shareholder: Cede & Co.
3. Save transaction
4. Query database for the new transaction

**Expected Result:**
- `share_quantity` in database should be **-1000** (negative)
- Outstanding should DECREASE by 1000

**Actual Result (if bug exists):**
- `share_quantity` stored as **+1000** (positive)
- Outstanding INCREASES by 1000 (wrong!)

---

### Test Case 1.2: Verify Position Calculation with Mixed Signs
**Setup:**
Create test issuer with transactions:
| Type | Quantity (entered) | Expected DB Value |
|------|-------------------|-------------------|
| IPO | 100,000 | +100,000 |
| DWAC Withdrawal | 20,000 | -20,000 |
| DWAC Deposit | 5,000 | +5,000 |

**Expected Outstanding:** 100,000 - 20,000 + 5,000 = **85,000**

**Steps:**
1. Create transactions as listed
2. Check position calculation

**Pass Criteria:**
- Outstanding = 85,000
- All DWAC Withdrawals have negative quantities in DB

---

## Bug 2: DWAC Deposit Transaction Behavior

### Description
The system might be incorrectly processing DWAC Deposit transactions, possibly:
- Subtracting instead of adding
- Double-counting
- Not including in position calculation

### Test Case 2.1: DWAC Deposit Adds to Outstanding
**Setup:**
- Issuer with existing Units outstanding: 7,883,632

**Steps:**
1. Add DWAC Deposit transaction:
   - Type: "DWAC Deposit"
   - CUSIP: G04104116 (Units)
   - Quantity: 2,500
   - Shareholder: Cede & Co.
2. Check new outstanding

**Expected Result:**
- New outstanding: 7,883,632 + 2,500 = **7,886,132**

**Actual Result (if bug exists):**
- Outstanding might show: 7,881,132 (subtracted instead of added)
- Or: 7,883,632 (not counted at all)

---

### Test Case 2.2: Verify DWAC Deposit Sign in Database
**Steps:**
1. Add DWAC Deposit of 2,500 units
2. Query database for the transaction

**Expected Result:**
```sql
SELECT share_quantity FROM transfers_new
WHERE transaction_type = 'DWAC Deposit' AND cusip = 'G04104116'
ORDER BY created_at DESC LIMIT 1;

-- Should return: +2500
```

**Pass Criteria:**
- DWAC Deposit quantity is stored as POSITIVE

---

### Test Case 2.3: Position Recalculation After DWAC Deposit
**Steps:**
1. Note current outstanding for Units
2. Add DWAC Deposit of 10,000
3. Refresh/recalculate position
4. Verify new outstanding = old + 10,000

**Check Points:**
- Is the transaction included in the sum?
- Is the sign correct (positive)?
- Does the UI reflect the updated position?

---

## Code Locations to Review

### 1. Transaction Entry (Sign Assignment)
File: `/components/import/RecordkeepingTransactionForm.jsx` or transaction creation API

Look for:
```javascript
// Check if DWAC Withdrawal is being made negative
if (transactionType === 'DWAC Withdrawal') {
  quantity = -Math.abs(quantity);  // Should force negative
}
```

### 2. Position Calculation
File: `/app/api/recordkeeping/transactions/route.js`

Current logic (lines 42-54):
```javascript
const isDebit = creditDebit.includes('debit') ||
                txType.includes('withdrawal') ||
                txType.includes('debit');

const signedQty = isDebit ? -absQty : absQty;
```

**Issue:** This only applies on INSERT. If data was entered with wrong sign, it stays wrong.

### 3. Outstanding Calculation Query
Find where outstanding is calculated - ensure it's a simple SUM of share_quantity:
```sql
SELECT SUM(share_quantity) as outstanding
FROM transfers_new
WHERE issuer_id = ? AND cusip = ?
```

---

## Recommended Fixes

### Fix 1: Enforce Sign on Transaction Entry
```javascript
// In transaction save handler
const enforceSign = (type, quantity) => {
  const absQty = Math.abs(quantity);

  // These types should ALWAYS be negative (shares leaving)
  if (['DWAC Withdrawal', 'Debit', 'Transfer Out', 'Redemption'].includes(type)) {
    return -absQty;
  }

  // These types should ALWAYS be positive (shares entering)
  if (['DWAC Deposit', 'Credit', 'IPO', 'Issuance', 'Transfer In'].includes(type)) {
    return absQty;
  }

  return quantity; // Keep as-is for other types
};
```

### Fix 2: Add Validation Warning
When saving a transaction, warn if:
- DWAC Withdrawal has positive quantity
- DWAC Deposit has negative quantity

### Fix 3: Database Constraint (optional)
```sql
ALTER TABLE transfers_new
ADD CONSTRAINT check_dwac_signs
CHECK (
  (transaction_type = 'DWAC Withdrawal' AND share_quantity <= 0) OR
  (transaction_type = 'DWAC Deposit' AND share_quantity >= 0) OR
  (transaction_type NOT IN ('DWAC Withdrawal', 'DWAC Deposit'))
);
```

---

## Summary

| Bug | Root Cause | Impact | Status |
|-----|-----------|--------|--------|
| Sign Mismatch | Manual entry didn't enforce negative for withdrawals | +10M error | Fixed via re-import |
| DWAC Deposit | Need to verify behavior | Unknown | Test required |

The 20,000 difference (7,866,132 vs 7,886,132) needs further investigation once both bugs are verified.
