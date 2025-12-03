# 🔍 COMPLETE AUTH FLOW TRACE - POST-AUTHENTICATION

## STEP-BY-STEP PROCESS AFTER AUTHENTICATION

### 📍 **PHASE 1: AUTH CONTEXT INITIALIZATION** (On App Mount)

**File:** `contexts/AuthContext.jsx`

#### Step 1.1: AuthProvider Component Mounts
```
🔵 [AUTH-INIT] useEffect TRIGGERED - Setting up auth
```
- Location: Line 92
- Triggered by: Component mount
- Dependencies: `[]` (runs once)

#### Step 1.2: Initialize Auth Function Executes
```
🔵 [INIT-AUTH] Starting auth initialization...
🔵 [INIT-AUTH] Getting session...
```
- Location: Lines 194-200
- Action: Calls `supabase.auth.getSession()`

**TWO POSSIBLE OUTCOMES:**

**A) NO SESSION:**
```
🔴 [INIT-AUTH] No session or error: [error]
🟢 [INIT-AUTH] Complete - Setting loading=false, initialized=true
```
- Sets: `loading = false`, `initialized = true`
- User state remains `null`
- **END OF FLOW** (redirects to login)

**B) SESSION EXISTS:**
```
🟢 [INIT-AUTH] Session found, user: [user-id]
```
- Sets: `user = session.user`

#### Step 1.3: Fetch User Role
```
🔵 [INIT-AUTH] Fetching user role...
🔵 [INIT-AUTH] User role: [role]
```
OR if cached:
```
🔵 [INIT-AUTH] Using cached role: [role]
```
- Location: Lines 213-221
- Action: Calls `getCurrentUserRole()` or uses cache
- Stores in: `userRoleCache.current`

#### Step 1.4: Fetch User Issuers
```
🔵 [INIT-AUTH] Fetching issuers...
🔵 [INIT-AUTH] Found [N] issuers
```
- Location: Lines 223-225
- Action: Calls `getUserIssuers(role)`

#### Step 1.5: Set Auth State
```
🔵 [INIT-AUTH] Setting state: userRole and availableIssuers
🟢 [INIT-AUTH] Complete - Setting loading=false, initialized=true
```
- Location: Lines 227-236
- Sets:
  - `userRole = role`
  - `availableIssuers = issuers`
  - `loading = false`
  - `initialized = true`

#### Step 1.6: Context Value Creation
```
🟣 [CONTEXT] useMemo CREATING NEW VALUE - user: true, userRole: [role], loading: false, initialized: true
```
- Location: Line 367
- **CRITICAL:** This triggers ALL context consumers to receive new value
- Dependencies: `[user, userRole, availableIssuers, loading, initialized, ...]`

---

### 📍 **PHASE 2: AUTH STATE CHANGE LISTENER** (Concurrent with Phase 1)

**File:** `contexts/AuthContext.jsx`

#### Step 2.1: Supabase Listener Fires
```
🟡 [AUTH-CHANGE] INITIAL_SESSION - isInitializing: true - hasSession: true
🟠 [AUTH-CHANGE] Ignoring INITIAL_SESSION during mount
```
- Location: Lines 100-106
- **IGNORED** if `isInitializing = true`
- After 100ms timeout, `isInitializing = false` (Line 184)

**POSSIBLE EVENTS:**
- `INITIAL_SESSION` - Ignored during mount
- `SIGNED_IN` - User signed in
- `SIGNED_OUT` - User signed out
- `TOKEN_REFRESHED` - Session token refreshed

#### Step 2.2: If SIGNED_IN Event After Mount
```
🟢 [AUTH-CHANGE] SIGNED_IN - User: [user-id]
🔵 [AUTH-CHANGE] Fetching user role...
🔵 [AUTH-CHANGE] User role: [role]
🔵 [AUTH-CHANGE] Fetching user issuers...
🔵 [AUTH-CHANGE] Found [N] issuers
🔵 [AUTH-CHANGE] Setting userRole and availableIssuers in state
```
- Location: Lines 119-139
- Sets: `user`, `userRole`, `availableIssuers`
- **TRIGGERS CONTEXT UPDATE** (useMemo deps change)

#### Step 2.3: Redirect Logic Check
```
🔵 [AUTH-CHANGE] Current path: /issuer/[issuerId]/record-keeping
🟢 [AUTH-CHANGE] User on correct page, NO redirect: /issuer/[issuerId]/record-keeping
```
- Location: Lines 144-150
- If on `/login` or `/` → redirects
- If on specific page → **NO REDIRECT**

---

### 📍 **PHASE 3: RECORD-KEEPING PAGE MOUNT** (When navigating to page)

**File:** `app/issuer/[issuerId]/record-keeping/page.jsx`

#### Step 3.1: Component Mounts, Params Unwrapped
```
🔵 [RKB-PARAMS] useEffect TRIGGERED - Unwrapping params
🟢 [RKB-PARAMS] Got issuerId: [issuer-id]
🟢 [RKB-PARAMS] Set issuerId in state
```
- Location: Lines 392-405
- Dependencies: `[]` (runs once)
- Action: Unwraps `paramsPromise` and sets `issuerId` state

#### Step 3.2: SWR Hooks Initialize (Immediately)
- Location: Lines 237-257
- SWR hooks for:
  - `securities`
  - `shareholders`
  - `enrichedTransactions`
  - `restrictionTemplates`
- **With NEW config:**
  - `revalidateOnFocus: true`
  - `revalidateIfStale: true`
  - `dedupingInterval: 1000` (1 second)

**SWR BEHAVIOR:**
- If cache exists and < 1 second old → use cache
- If cache stale or doesn't exist → fetch from API
- **IMPORTANT:** SWR hooks re-execute on EVERY re-render

---

### 📍 **PHASE 4: ISSUER VALIDATION** (After issuerId is set)

**File:** `app/issuer/[issuerId]/record-keeping/page.jsx`

#### Step 4.1: Validation Effect Triggers
```
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED - initialized: true, user: true, issuerId: [issuer-id], validated: null
```
- Location: Line 416
- Dependencies: `[initialized, user, issuerId]`
- **TRIGGERS** when any of these change

#### Step 4.2: Validation Guards
```
🟠 [RKB-VALIDATE #1] Skipping - Not ready (initialized:false, user:false, issuerId:false)
```
OR
```
🟢 [RKB-VALIDATE #1] Already validated, SKIPPING
```
OR proceed to validation...

#### Step 4.3: Call validateAndSetIssuer
```
🔵 [RKB-VALIDATE #1] Running validation for issuerId: [issuer-id]
🔵 [RKB-VALIDATE #1] Calling validateAndSetIssuer...
```
- Location: Lines 429-435

---

### 📍 **PHASE 5: VALIDATE AND SET ISSUER EXECUTION**

**File:** `contexts/AuthContext.jsx`

#### Step 5.1: Function Called
```
[AUTH] validateAndSetIssuer called for: [issuer-id], user: true, forceReload: false
```
- Location: Line 245

#### Step 5.2: Duplicate Check
```
[AUTH] Validation already in progress for: [issuer-id] - SKIPPING to prevent duplicate
```
- Location: Lines 226-236
- If already running → waits 50ms → returns cached result
- **PREVENTS DUPLICATE CALLS**

OR if not in progress:
```
[AUTH] Using cached issuer validation for: [issuer-id]
```
- Location: Lines 241-248
- If cache exists and < 5 minutes old → use cache
- Sets: `currentIssuer`, `userRole`, `issuerSpecificRole`, `userRoles`
- **RETURNS IMMEDIATELY**

#### Step 5.3: Fresh Validation (if cache miss)
```
[AUTH] Validating issuer access for: [issuer-id]
```
- Location: Line 254
- Marks as in-progress: `validationInProgress.current.add(issuerId)`
- Fetches:
  - `validateIssuerAccess(issuerId, globalUserRole)`
  - `getUserRoleForIssuer(issuerId, globalUserRole)`
  - `getUserRolesForIssuer(issuerId)`

#### Step 5.4: Set Issuer State
```
[AUTH] Validation completed for: [issuer-id]
```
- Location: Lines 275-291
- Sets:
  - `currentIssuer = issuer`
  - `userRole = role`
  - `issuerSpecificRole = specificRole`
  - `userRoles = roles`
- Caches result with timestamp
- Removes from in-progress: `validationInProgress.current.delete(issuerId)`

#### Step 5.5: Context Value Update Check
```
🟣 [CONTEXT] useMemo CREATING NEW VALUE - user: true, userRole: [role], loading: false, initialized: true
```
- **SHOULD NOT TRIGGER** if only `currentIssuer`/`issuerSpecificRole`/`userRoles` changed
- **ONLY TRIGGERS** if `user`/`userRole`/`availableIssuers`/`loading`/`initialized` changed

---

### 📍 **PHASE 6: POTENTIAL LOOP POINT** ⚠️

#### LOOP TRIGGER #1: Context Value Recreates
If `useMemo` dependencies include issuer-specific state:
```
🟣 [CONTEXT] useMemo CREATING NEW VALUE
🟡 [RKB-VALIDATE #2] useEffect TRIGGERED
🔵 [RKB-VALIDATE #2] Running validation
[AUTH] validateAndSetIssuer called
```
**Result:** Infinite loop

**FIX:** Remove `currentIssuer`, `issuerSpecificRole`, `userRoles` from useMemo deps

#### LOOP TRIGGER #2: Multiple Validation Calls
```
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED
🟡 [RKB-VALIDATE #2] useEffect TRIGGERED (duplicate)
```
**Result:** Race condition, duplicate API calls

**FIX:** Added `validationInProgress` ref to prevent duplicates

#### LOOP TRIGGER #3: SWR Revalidation Cascade
```
🔵 [RKB-VALIDATE #1] validateAndSetIssuer returned
// State updates from validation
// Component re-renders
// SWR sees re-render, checks staleness
// Triggers revalidation
// Data updates
// Component re-renders again
// Effect runs again
```
**Result:** Cascade of re-renders

**FIX:** `validatedIssuerRef` prevents re-validation

---

### 📍 **PHASE 7: REALTIME SUBSCRIPTION** (After issuerId set)

**File:** `app/issuer/[issuerId]/record-keeping/page.jsx`

#### Step 7.1: Supabase Realtime Subscribes
```
🔌 Subscribing to realtime changes for issuer: [issuer-id]
```
- Location: Line 295
- Dependencies: `[issuerId, mutateTransactions]`

#### Step 7.2: On Transaction Change
```
⚡ REALTIME EVENT: INSERT {eventType: 'INSERT', new: {...}}
➕ Optimistically adding new transaction: [txn-id]
✅ Optimistic update complete, background verification in progress
```
- Location: Lines 310-377
- Updates SWR cache optimistically
- Triggers background revalidation

---

## 🚨 **WHERE THE LOOP HAPPENS**

### **Current Theory:**

1. **Page mounts** → `issuerId` set → validation effect triggers (#1)
2. **validateAndSetIssuer** called → sets `currentIssuer`, `issuerSpecificRole`, `userRoles`
3. **If these are in context useMemo deps** → context value recreates
4. **Context consumers re-render** → validation effect re-triggers (#2)
5. **validateAndSetIssuer** called again
6. **Loop continues...**

### **Expected Logs for Loop:**
```
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED
🔵 [RKB-VALIDATE #1] Calling validateAndSetIssuer...
[AUTH] validateAndSetIssuer called
[AUTH] Using cached issuer validation
🔵 [RKB-VALIDATE #1] validateAndSetIssuer returned
🟢 [RKB-VALIDATE #1] Validation successful

🟣 [CONTEXT] useMemo CREATING NEW VALUE  ⚠️ SHOULDN'T HAPPEN

🟡 [RKB-VALIDATE #2] useEffect TRIGGERED  ⚠️ LOOP DETECTED
🔵 [RKB-VALIDATE #2] Calling validateAndSetIssuer...
...repeats...
```

---

## 🔧 **DEBUGGING INSTRUCTIONS**

1. Open browser console
2. Clear console
3. Refresh page or resume session
4. Look for:
   - How many `[RKB-VALIDATE #N]` calls happen
   - How many `[CONTEXT] useMemo CREATING NEW VALUE` happen
   - Whether they're cascading

**EXPECTED (GOOD):**
- `[RKB-VALIDATE #1]` - Once only
- `[CONTEXT] useMemo CREATING NEW VALUE` - Once during init, once after validation if userRole changes

**BAD (LOOP):**
- `[RKB-VALIDATE #1, #2, #3, #4...]` - Multiple calls
- `[CONTEXT] useMemo CREATING NEW VALUE` - Repeating after each validation
