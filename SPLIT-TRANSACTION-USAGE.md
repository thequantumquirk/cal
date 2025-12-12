# Split Transaction - Correct Usage Guide

## The Issue You Encountered

**What Happened:**
When you performed a Split transaction, you selected **"Class A Ordinary Stock"** as the security instead of **"Units"**.

**Result:**
```
Transaction 1: DWAC Withdrawal of Class A (WRONG - should be Units)
Transaction 2: DWAC Deposit of Class A
Transaction 3: DWAC Deposit of Warrants
```

This created incorrect data because:
- You can't debit Class A shares and then credit Class A shares to the same person
- The Units weren't debited at all
- The shareholder's balances are now incorrect

---

## How to Use Split Transaction Correctly

### ✅ CORRECT Steps:

**1. Select Transaction Type:**
```
Transaction Type: Split (Units → Class A + Warrants)
```

**2. Select Security:**
```
Security: [SELECT UNITS SECURITY]
         NOT Class A
         NOT Warrants
         MUST BE UNITS!
```

**3. Select Shareholder:**
```
Shareholder: [The person who owns the Units]
```

**4. Enter Quantity:**
```
Share Quantity: [Number of Units to split]
Example: 1000
```

**5. Auto-Calculation:**
The system will automatically calculate:
- Class A shares: 1,000 (based on split ratio)
- Warrants: 1,000 (based on split ratio)

**6. Preview:**
Click "Preview" button - you should see:
```
Split Transaction Preview

This will create 3 separate transactions

1. Debit 1,000 Units from John Doe
2. Credit 1,000 Class A shares to John Doe
3. Credit 1,000 Warrants/Rights to John Doe
```

**7. Process:**
Click "Process Transaction"

---

## What Gets Created (CORRECT)

### Database Transactions:

**Transaction 1: Debit Units**
```
CUSIP: [UNITS CUSIP] ← Uses Units CUSIP
Security: Units
Type: DWAC Withdrawal
Shareholder: John Doe
Quantity: 1,000
Credit/Debit: Debit
Notes: Split transaction - Debit Units
```

**Transaction 2: Credit Class A**
```
CUSIP: [CLASS A CUSIP] ← Uses Class A CUSIP
Security: Class A Ordinary Stock
Type: DWAC Deposit
Shareholder: John Doe
Quantity: 1,000
Credit/Debit: Credit
Notes: Split transaction - Credit Class A
```

**Transaction 3: Credit Warrants**
```
CUSIP: [WARRANTS CUSIP] ← Uses Warrants CUSIP
Security: Rights/Warrants
Type: DWAC Deposit
Shareholder: John Doe
Quantity: 1,000
Credit/Debit: Credit
Notes: Split transaction - Credit Warrants
```

### Balance Changes:

**Before Split:**
```
John Doe:
- Units: 2,000
- Class A: 0
- Warrants: 0
```

**After Split (1,000 Units):**
```
John Doe:
- Units: 1,000 (decreased by 1,000)
- Class A: 1,000 (increased by 1,000)
- Warrants: 1,000 (increased by 1,000)
```

---

## Error Prevention

### New Validation (Added):

**At Preview:**
If you select Class A or Warrants instead of Units, you'll see:
```
❌ Error: "Split transaction requires Units to be selected.
Please select the Units security."
```

**At Processing:**
Double-check validation prevents processing if wrong security selected:
```
❌ Error: "Split transaction requires Units to be selected as the security.
Please select the Units security, not Class A or Warrants."
```

---

## Common Mistakes to Avoid

### ❌ WRONG #1: Selecting Class A as Security
```
Security: Class A Ordinary Stock ← WRONG!
```
**Result:** Will try to debit Class A (doesn't make sense)

### ❌ WRONG #2: Selecting Warrants as Security
```
Security: Rights/Warrants ← WRONG!
```
**Result:** Will try to debit Warrants (doesn't make sense)

### ❌ WRONG #3: Not Having Units Security
```
Available Securities:
- Class A Ordinary Stock
- Rights/Warrants
[No Units security exists]
```
**Result:** Can't perform split - need to create Units security first

---

## Why This Matters

### Real-World SPAC Unit Split Process:

**Step 1: IPO**
```
Company issues 10,000 Units to investors
Each Unit = 1 share + 1 warrant bundled together
```

**Step 2: Split (45 days after IPO)**
```
Investors request to separate ("split") their Units:
- They give back their Units (Debit)
- They receive Class A shares (Credit)
- They receive Warrants (Credit)
```

**Step 3: Result**
```
Before: Investor owns bundled Units
After: Investor owns unbundled Class A + Warrants separately
```

This is why you **MUST** select Units as the security - you're splitting apart the bundled Units!

---

## How to Fix Your Test Data

Since you already created incorrect split transactions, you need to:

**Option 1: Delete and Redo (Recommended for Testing)**
1. Delete the 3 incorrect transactions from the database
2. Reset shareholder positions
3. Redo the split with UNITS selected

**Option 2: Manual Correction**
1. Create a "Transfer Debit" to debit 15 Class A from Bala Shareholder
2. Create a "Transfer Credit" to credit 15 Units to Bala Shareholder
3. This will correct the balances

**Option 3: Leave for Testing**
- If this is just test data, you can leave it and start fresh with correct splits

---

## Quick Reference

### Split Transaction Checklist:

- [ ] Transaction Type: **Split (Units → Class A + Warrants)**
- [ ] Security: **UNITS** (not Class A, not Warrants)
- [ ] Shareholder: Person who owns the Units
- [ ] Quantity: Number of Units to split
- [ ] Preview shows: Debit UNITS, Credit Class A, Credit Warrants
- [ ] Process: Creates 3 transactions with correct CUSIPs

### Expected Result:

```
Before Split:
✓ Shareholder owns Units

After Split:
✓ Units balance decreased
✓ Class A balance increased
✓ Warrants balance increased
✓ 3 transactions created with correct CUSIPs
```

---

## Example: Correct Split Transaction

### Input:
```
Transaction Type: Split (Units → Class A + Warrants)
Security: Cal Redwood Units (CUSIP: CRAU12345) ← MUST BE UNITS!
Shareholder: Bala Shareholder
Quantity: 100 Units
Date: 11/19/2025
```

### Preview Shows:
```
Split Transaction Preview
This will create 3 separate transactions

1. Debit 100 Units from Bala Shareholder
2. Credit 100 Class A shares to Bala Shareholder
3. Credit 100 Warrants/Rights to Bala Shareholder
```

### Result in Record Keeping Book:
```
Date       | CUSIP      | Security | Type            | C/D    | Qty
-----------|------------|----------|-----------------|--------|-----
11/19/2025 | CRAU12345  | Units    | DWAC Withdrawal | Debit  | 100
11/19/2025 | G17564108  | Class A  | DWAC Deposit    | Credit | 100
11/19/2025 | G1000      | Rights   | DWAC Deposit    | Credit | 100
```

**Notice:** 3 different CUSIPs - one for each security type!

---

## Summary

**Golden Rule for Split Transactions:**
> Always select **UNITS** as the security when performing a Split transaction. The system will automatically find and use the Class A and Warrants securities for the credit transactions.

**Why:**
- Split means: Take apart the bundled Units
- You're giving back Units (Debit)
- You're receiving Class A + Warrants (Credit)
- Therefore, select UNITS as the security!
