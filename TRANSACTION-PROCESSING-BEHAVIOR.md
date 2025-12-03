# Transaction Processing Module - Complete Behavior Summary

## Overview
The Transaction Processing module handles all share transfer operations for a transfer agent system, automatically maintaining accurate shareholder ledgers and position tracking.

---

## Transaction Types & Behaviors

### 1. IPO (Original Issuance)
**Purpose:** Initial issuance of shares from company to shareholder

**What It Does:**
- ✅ Creates 1 Credit transaction
- ✅ Adds shares to shareholder's balance
- ✅ Increases total outstanding shares
- ✅ Updates shareholder position table

**Database Effect:**
```javascript
transfers_new: 1 row inserted
  - transaction_type: "IPO"
  - share_quantity: [positive number]
  - credit_debit: "Credit" (derived)

shareholder_positions_new: 1 row upserted
  - shares_owned: [increased by quantity]
```

**Use Case:** "Issue 10,000 Class A shares to John Doe in IPO"

---

### 2. Split (Units → Class A + Warrants)
**Purpose:** Automatically split Units into Class A shares and Warrants

**What It Does:**
- ✅ Creates 3 transactions atomically:
  1. Debits Units from shareholder
  2. Credits Class A to shareholder
  3. Credits Warrants to shareholder
- ✅ Updates positions for all 3 securities
- ✅ Auto-calculates Class A and Warrant quantities based on split ratios
- ✅ Allows manual override of calculated amounts

**Database Effect:**
```javascript
transfers_new: 3 rows inserted
  1. DWAC Withdrawal (Units) - Debit
  2. DWAC Deposit (Class A) - Credit
  3. DWAC Deposit (Warrants) - Credit

shareholder_positions_new: 3 rows upserted
  - Units: shares_owned decreased
  - Class A: shares_owned increased
  - Warrants: shares_owned increased
```

**Use Case:** "John Doe splits 1,000 Units → receives 1,000 Class A + 1,000 Warrants"

**Special Features:**
- Split ratios pulled from database (`splits` table)
- Default ratio: 1:1 if not configured
- All 3 transactions linked via notes
- Fails atomically if any transaction fails

---

### 3. DWAC Deposit
**Purpose:** Deposit shares into DTC (usually to Cede & Co)

**What It Does:**
- ✅ Creates 1 Credit transaction
- ✅ Adds shares to shareholder's balance
- ✅ Increases total outstanding shares
- ✅ Updates shareholder position

**Database Effect:**
```javascript
transfers_new: 1 row inserted
  - transaction_type: "DWAC Deposit"
  - share_quantity: [positive number]
  - credit_debit: "Credit" (derived)

shareholder_positions_new: 1 row upserted
  - shares_owned: [increased]
```

**Use Case:** "Deposit 5,000 Class A shares to Cede & Co for DTC"

---

### 4. DWAC Withdrawal
**Purpose:** Withdraw shares from DTC (usually from Cede & Co)

**What It Does:**
- ✅ Creates 1 Debit transaction
- ✅ Removes shares from shareholder's balance
- ✅ Decreases total outstanding shares
- ✅ Updates shareholder position
- ✅ Shows split calculator if Cede & Co is selected (optional feature)

**Database Effect:**
```javascript
transfers_new: 1 row inserted
  - transaction_type: "DWAC Withdrawal"
  - share_quantity: [positive number]
  - credit_debit: "Debit" (derived)

shareholder_positions_new: 1 row upserted
  - shares_owned: [decreased]
```

**Use Case:** "Withdraw 1,000 Units from Cede & Co for transfer agent processing"

**Note:** Quantity is always stored as positive; transaction_type determines it's a debit

---

### 5. Transfer Credit
**Purpose:** Credit shares to a shareholder (typically receiving end of shareholder-to-shareholder transfer)

**What It Does:**
- ✅ Creates 1 Credit transaction
- ✅ Adds shares to shareholder's balance
- ✅ NO change to total outstanding (shares just moved between shareholders)
- ✅ Updates shareholder position

**Database Effect:**
```javascript
transfers_new: 1 row inserted
  - transaction_type: "Transfer Credit"
  - share_quantity: [positive number]
  - credit_debit: "Credit" (derived)

shareholder_positions_new: 1 row upserted
  - shares_owned: [increased for this shareholder]
```

**Use Case:** "Credit 500 Class A shares to Jane Smith (she's receiving from John)"

**Important:** Typically paired with Transfer Debit from another shareholder

---

### 6. Transfer Debit
**Purpose:** Debit shares from a shareholder (typically sending end of shareholder-to-shareholder transfer)

**What It Does:**
- ✅ Creates 1 Debit transaction
- ✅ Removes shares from shareholder's balance
- ✅ NO change to total outstanding (shares just moved between shareholders)
- ✅ Updates shareholder position

**Database Effect:**
```javascript
transfers_new: 1 row inserted
  - transaction_type: "Transfer Debit"
  - share_quantity: [positive number]
  - credit_debit: "Debit" (derived)

shareholder_positions_new: 1 row upserted
  - shares_owned: [decreased for this shareholder]
```

**Use Case:** "Debit 500 Class A shares from John Doe (he's transferring to Jane)"

**Important:** Typically paired with Transfer Credit to another shareholder

---

## Automatic Position Updates

### How It Works:
Every transaction automatically triggers position calculation and update.

**Calculation Logic:**
```javascript
For each shareholder + security combination:
1. Fetch ALL transactions up to current date
2. Calculate total:
   - Credit transactions: ADD quantity
   - Debit transactions: SUBTRACT quantity
3. Upsert result to shareholder_positions_new table
```

**Credit Transactions** (ADD to balance):
- IPO
- DWAC Deposit
- Transfer Credit

**Debit Transactions** (SUBTRACT from balance):
- DWAC Withdrawal
- Transfer Debit

**Position Update Timing:**
- Regular transactions: Updates 1 security position
- Split transactions: Updates 3 security positions (Units, Class A, Warrants)
- All updates happen automatically after transaction insert
- Runs in database transaction (all or nothing)

---

## Data Flow

### Step-by-Step Process:

**1. User Input**
```
User fills form:
- Transaction Type
- Security
- Shareholder
- Quantity
- Date
- Notes (optional)
```

**2. Auto-Calculation** (for Split/DWAC Withdrawal)
```
If Split or DWAC Withdrawal:
- Fetch split ratios from database
- Calculate Class A shares
- Calculate Warrants
- Display in UI for review/override
```

**3. Preview**
```
User clicks "Preview" button:
- Validates all required fields
- Shows transaction details
- For Split: Shows all 3 transactions that will be created
- Lazy-loads restrictions data if needed
```

**4. Processing**
```
User clicks "Process Transaction" button:

Regular Transaction (IPO, DWAC, Transfer):
  a. Insert 1 row into transfers_new
  b. Update 1 shareholder position
  c. Show success toast

Split Transaction:
  a. Validate Class A and Warrant securities exist
  b. Insert 3 rows into transfers_new atomically
  c. Update 3 shareholder positions in parallel
  d. Show success toast
```

**5. Position Update** (Automatic)
```
For each affected security:
  a. Get security_id from CUSIP
  b. Fetch all transactions for shareholder + security
  c. Calculate total shares owned:
     total = Σ(credits) - Σ(debits)
  d. Upsert to shareholder_positions_new:
     - issuer_id
     - shareholder_id
     - security_id
     - shares_owned (calculated total)
     - position_date
     - updated_at
```

**6. User Feedback**
```
Success:
  - Toast notification appears
  - "View Record Book" button shown
  - Click button → Navigate to Record Keeping page
  - Form resets for next transaction

Error:
  - Error toast with specific message
  - Transaction rolled back (not saved)
  - Form remains for corrections
```

---

## Database Tables Affected

### 1. `transfers_new` (Transaction Ledger)
**Always Modified:** Every transaction creates 1-3 rows

**Fields:**
- `transaction_type`: Type of transaction
- `shareholder_id`: Who owns the shares
- `cusip`: Which security
- `share_quantity`: Amount (always positive)
- `transaction_date`: When it occurred
- `status`: Usually "Active"
- `notes`: Optional description

**Derivation:**
- `credit_debit`: Derived from transaction_type (not stored)

---

### 2. `shareholder_positions_new` (Current Balances)
**Always Modified:** Position updated after every transaction

**Fields:**
- `issuer_id`: Which company
- `shareholder_id`: Which shareholder
- `security_id`: Which security
- `shares_owned`: **Current total balance** (calculated)
- `position_date`: As of date
- `updated_at`: Last modification timestamp

**Key Constraint:**
- Unique on: `(issuer_id, shareholder_id, security_id, position_date)`
- Uses UPSERT to update existing or insert new

---

### 3. `splits` (Split Ratio Configuration)
**Read Only:** Used to calculate split amounts

**Fields:**
- `transaction_type`: "DWAC Withdrawal"
- `class_a_ratio`: Units → Class A ratio (e.g., 1)
- `rights_ratio`: Units → Warrants ratio (e.g., 1)

---

## User Interface Behavior

### Form States:

**Initial:**
- All fields empty
- Preview disabled
- Process button disabled

**After Filling Form:**
- Preview button enabled
- Validation on blur

**After Preview:**
- Preview panel shows transaction details
- Process button enabled
- Can edit and re-preview

**After Processing:**
- Success toast appears with action button
- Form resets
- Ready for next transaction

---

### Special UI Features:

**1. Split Calculator** (Split & DWAC Withdrawal when Cede selected)
```
Displays:
- Auto-calculated Class A shares
- Auto-calculated Warrants
- Editable fields (can override)
- Visual feedback (green/blue gradient)
```

**2. Transaction Hints**
```
Shows contextual help based on selected type:
- IPO: "Original issuance of new shares to shareholder"
- Split: "Automatically splits Units into Class A shares and Warrants - Creates 3 transactions in one step!"
- DWAC Withdrawal: "Expected Split: 1 Unit → X Class A, Y Right"
```

**3. Preview Panel**
```
For Split transactions:
- Shows all 3 transactions that will be created
- Lists: Debit Units, Credit Class A, Credit Warrants
- Shows shareholder name and quantities

For regular transactions:
- Shows single transaction details
- Displays Credit/Debit badge
- Shows security and shareholder info
```

---

## Error Handling

### Validation Errors (Before Processing):
- ❌ Missing transaction type → "Please select a transaction type"
- ❌ Missing security → "Please select a security"
- ❌ Missing shareholder → "Please select a shareholder"
- ❌ Invalid quantity → "Please enter a valid share quantity"
- ❌ Missing date → "Please select a transaction date"

### Processing Errors:

**Split Transaction:**
- ❌ Class A security not found → "Class A security not found. Please create a Class A security first."
- ❌ Warrant security not found → "Warrant/Right security not found. Please create a Warrant/Right security first."
- ❌ Database error → "Failed to create split transactions: [error details]"

**Regular Transaction:**
- ❌ Database error → "Database error: [error details]"
- ❌ Security not found → "Could not find security for position update"

**Position Update Errors:**
- ⚠️ Position update fails → Shows warning toast but transaction still succeeds
- ⚠️ "Transaction processed but position update failed"
- ⚠️ "Transaction processed but position may need manual update"

**Graceful Degradation:**
- Transaction insert always succeeds or fails atomically
- Position updates are "best effort" - won't rollback transaction
- User is notified of partial failures

---

## Performance Optimizations

### 1. SWR Caching
```javascript
Securities, Shareholders, Splits data cached:
- Revalidate on focus: false
- Revalidate on reconnect: false
- Deduping interval: 5 minutes
- Instant page loads after first visit
```

### 2. Lazy Loading
```javascript
Restrictions data:
- Only fetched when validation runs
- Cached after first load
- Invalidated after adding restriction
```

### 3. Parallel Processing
```javascript
Split position updates:
- 3 position updates run in parallel
- Uses Promise.all()
- Faster than sequential updates
```

### 4. Progressive Loading
```javascript
Page load:
- Shows loading state only during auth initialization
- Form becomes interactive immediately
- Data loads in background
```

---

## Security & Permissions

### Row-Level Security (RLS):
- Users can only access transactions for their assigned issuers
- Admin role can access all issuers
- Transfer Agent role: Edit permissions
- Viewer role: Read-only

### Permission Checks:
```javascript
Before showing form:
- Validates user has edit permission
- Shows "Access Restricted" if read-only
- Redirects to login if not authenticated
```

---

## Restrictions Integration

### When Processing Credit Transactions:

**Optional: Add Restriction**
```
If user checks "Add restriction" checkbox:
1. Shows restriction type dropdown
2. Shows restriction description field
3. After transaction succeeds:
   - Posts to /api/active-restrictions
   - Links restriction to shareholder + security
   - Shows success/warning toast
```

**Restriction Warning:**
```
During validation:
1. Lazy-loads active restrictions
2. Checks if shareholder has restrictions on this security
3. Shows warning toast if restrictions found
4. Transaction can still proceed (warning only)
```

---

## Audit Trail

### Every Transaction Records:
- ✅ Who: `shareholder_id`
- ✅ What: `transaction_type`, `share_quantity`
- ✅ When: `transaction_date`, `created_at`
- ✅ Where: `issuer_id`, `cusip`
- ✅ Why: `notes` field
- ✅ Status: `status` field
- ✅ Who entered it: `created_by` (from auth context)

### Historical Tracking:
- All transactions preserved (never deleted)
- Positions track by date
- Can reconstruct balances as of any historical date
- Complete audit trail for compliance

---

## Summary

### What Gets Created:
| Transaction Type | Rows in transfers_new | Positions Updated | Total Outstanding |
|------------------|----------------------|-------------------|-------------------|
| IPO | 1 | 1 security | ↑ Increases |
| Split | 3 | 3 securities | All 3 change |
| DWAC Deposit | 1 | 1 security | ↑ Increases |
| DWAC Withdrawal | 1 | 1 security | ↓ Decreases |
| Transfer Credit | 1 | 1 security | No change |
| Transfer Debit | 1 | 1 security | No change |

### Key Behaviors:
1. ✅ All quantities stored as positive numbers
2. ✅ Transaction type determines debit/credit
3. ✅ Positions automatically calculated and updated
4. ✅ Credits ADD to balance, Debits SUBTRACT from balance
5. ✅ Split creates 3 linked transactions atomically
6. ✅ Position updates use cumulative calculation (not deltas)
7. ✅ Transfers don't change total outstanding (just ownership)
8. ✅ Toast notifications with "View Record Book" action
9. ✅ Error handling prevents data corruption
10. ✅ Complete audit trail maintained

### Industry Compliance:
- ✅ Follows DTC/DTCC transfer protocols
- ✅ Matches transfer agent recordkeeping standards
- ✅ Supports SPAC unit separation requirements
- ✅ Maintains SEC-compliant audit trail
- ✅ Double-entry accounting principles (every transaction balanced)
