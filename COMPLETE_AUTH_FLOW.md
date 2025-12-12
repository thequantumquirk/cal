# 🔍 COMPLETE POST-AUTHENTICATION PROCESS - EVERY SINGLE STEP

## 📋 **CONSOLE LOG LEGEND**

```
🔵 = Information/Start of process
🟢 = Success/Completion
🟡 = Warning/Conditional trigger
🟠 = Skipped/Ignored
🔴 = Error/Failure
🟣 = Context/State change
⚡ = Realtime event
```

---

## ⚙️ **STEP-BY-STEP EXECUTION FLOW**

### **1️⃣ APP STARTS - AuthProvider Mounts**

```
🔵 [AUTH-INIT] useEffect TRIGGERED - Setting up auth
```
**What happens:**
- AuthContext provider component mounts
- Main initialization useEffect runs (Line 93, AuthContext.jsx)
- Dependencies: `[]` (runs ONCE on mount)

---

### **2️⃣ INIT AUTH FUNCTION EXECUTES**

```
🔵 [INIT-AUTH] Starting auth initialization...
🔵 [INIT-AUTH] Getting session...
```
**What happens:**
- Calls `supabase.auth.getSession()` (Line 200)
- Checks if user has active session

**TWO PATHS:**

#### **PATH A: No Session** ❌
```
🔴 [INIT-AUTH] No session or error: [error]
🟢 [INIT-AUTH] Complete - Setting loading=false, initialized=true
```
- Sets: `loading = false`, `initialized = true`
- User stays `null`
- Redirects to `/login`
- **FLOW ENDS**

#### **PATH B: Session Exists** ✅
```
🟢 [INIT-AUTH] Session found, user: [user-id]
```
- Sets: `user = session.user`
- **CONTINUES TO STEP 3**

---

### **3️⃣ FETCH USER ROLE**

```
🔵 [INIT-AUTH] Fetching user role...
🔵 [INIT-AUTH] User role: admin
```
**OR if already cached:**
```
🔵 [INIT-AUTH] Using cached role: admin
```
**What happens:**
- Checks `userRoleCache.current` (Line 213)
- If null → calls `getCurrentUserRole()` (database query)
- If exists → uses cached value
- Stores in cache for future use
- **Role examples:** admin, superadmin, transfer_team, broker, shareholder

---

### **4️⃣ FETCH USER ISSUERS**

```
🔵 [INIT-AUTH] Fetching issuers...
🔵 [INIT-AUTH] Found 5 issuers
```
**What happens:**
- Calls `getUserIssuers(role)` (Line 224)
- Returns array of issuers user has access to
- Based on user's role and permissions

---

### **5️⃣ SET INITIAL AUTH STATE**

```
🔵 [INIT-AUTH] Setting state: userRole and availableIssuers
🟢 [INIT-AUTH] Complete - Setting loading=false, initialized=true
```
**What happens:**
- Sets React state:
  - `userRole = 'admin'`
  - `availableIssuers = [...]`
  - `loading = false` ⚠️ **TRIGGERS RE-RENDER**
  - `initialized = true` ⚠️ **TRIGGERS RE-RENDER**

---

### **6️⃣ CONTEXT VALUE CREATION (FIRST TIME)**

```
🟣 [CONTEXT] useMemo CREATING NEW VALUE - user: true, userRole: admin, loading: false, initialized: true
```
**What happens:**
- `useMemo` dependencies changed (`user`, `userRole`, `loading`, `initialized`)
- Creates new context value object (Line 367)
- **ALL CONTEXT CONSUMERS RE-RENDER** 🚨
  - This includes your RecordKeeping page
  - Any other page using `useAuth()`

**Dependencies that trigger recreation:**
- `user` ✅
- `userRole` ✅
- `availableIssuers` ✅
- `loading` ✅
- `initialized` ✅
- `validateAndSetIssuer` ✅
- `hasPermission` ✅
- etc.

**NOT in dependencies (won't trigger recreation):**
- `currentIssuer` ❌
- `issuerSpecificRole` ❌
- `userRoles` ❌

---

### **7️⃣ SUPABASE AUTH LISTENER FIRES**

```
🟡 [AUTH-CHANGE] INITIAL_SESSION - isInitializing: true - hasSession: true
🟠 [AUTH-CHANGE] Ignoring INITIAL_SESSION during mount
```
**What happens:**
- Supabase `onAuthStateChange` fires with `INITIAL_SESSION` event
- `isInitializing = true` (set on Line 93)
- Event is **IGNORED** (Line 104)
- After 100ms, `isInitializing = false` (Line 184)

**Why ignored:**
- Prevents duplicate initialization
- We already handled session in `initializeAuth()`

---

### **8️⃣ RECORDKEEPING PAGE MOUNTS** (If navigating to /issuer/[id]/record-keeping)

```
🔵 [RKB-PARAMS] useEffect TRIGGERED - Unwrapping params
🟢 [RKB-PARAMS] Got issuerId: abc-123
🟢 [RKB-PARAMS] Set issuerId in state
```
**What happens:**
- Page component mounts
- Params unwrap useEffect runs (Line 392)
- Unwraps Next.js `paramsPromise`
- Sets `issuerId = 'abc-123'` in local state ⚠️ **TRIGGERS RE-RENDER**

---

### **9️⃣ SWR HOOKS INITIALIZE**

**What happens:**
- 4 SWR hooks execute (Lines 237-257):
  - `useSWR(/api/securities?issuerId=abc-123)`
  - `useSWR(/api/shareholders?issuerId=abc-123)`
  - `useSWR(/api/record-keeping-transactions?issuerId=abc-123)`
  - `useSWR(/api/restriction-templates?issuerId=abc-123)`

**With NEW config:**
```javascript
{
  revalidateOnFocus: true,
  revalidateIfStale: true,
  dedupingInterval: 1000,  // 1 second
  refreshInterval: 0
}
```

**SWR behavior:**
- If cache exists AND < 1 second old → **use cache**
- If cache stale OR doesn't exist → **fetch from API**
- **IMPORTANT:** These hooks re-execute on EVERY component re-render

---

### **🔟 VALIDATION EFFECT TRIGGERS (FIRST TIME)**

```
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED - initialized: true, user: true, issuerId: abc-123, validated: null
```
**What happens:**
- Dependencies changed: `[initialized, user, issuerId]` (Line 454)
- `initialized` was `false` → now `true` (from Step 5)
- `user` was `null` → now `{...}` (from Step 5)
- `issuerId` was `null` → now `'abc-123'` (from Step 8)

**Guard checks:**
```
// If any false, skips:
if (!initialized || !user || !issuerId) {
  🟠 [RKB-VALIDATE #1] Skipping - Not ready
  return;
}

// If already validated, skips:
if (validatedIssuerRef.current === issuerId) {
  🟢 [RKB-VALIDATE #1] Already validated, SKIPPING
  return;
}
```

**If passes guards:**
```
🔵 [RKB-VALIDATE #1] Running validation for issuerId: abc-123
🔵 [RKB-VALIDATE #1] Calling validateAndSetIssuer...
```

---

### **1️⃣1️⃣ VALIDATE AND SET ISSUER FUNCTION**

```
[AUTH] validateAndSetIssuer called for: abc-123, user: true, forceReload: false
```

**Three possible paths:**

#### **PATH A: Already Validating (Duplicate Prevention)** 🛡️
```
[AUTH] Validation already in progress for: abc-123 - SKIPPING to prevent duplicate
```
- Checks `validationInProgress.current.has(issuerId)` (Line 226)
- If true → waits 50ms → returns cached result
- **PREVENTS RACE CONDITIONS**

#### **PATH B: Cache Hit** 💨
```
[AUTH] Using cached issuer validation for: abc-123
[AUTH] Setting state from cache - currentIssuer: abc-123, userRole: admin
[AUTH] Cache state set complete
```
- Checks cache: `issuerAccessCache.current.get(issuerId)` (Line 268)
- If exists AND < 5 minutes old → uses cache
- Sets state:
  - `setCurrentIssuer(cached.issuer)` ⚠️
  - `setUserRole(cached.userRole)` ⚠️
  - `setIssuerSpecificRole(cached.issuerSpecificRole)` ⚠️
  - `setUserRoles(cached.userRoles)` ⚠️
- **RETURNS IMMEDIATELY**

#### **PATH C: Fresh Validation** 🔄
```
[AUTH] Validating issuer access for: abc-123
```
- Marks as in-progress: `validationInProgress.current.add(issuerId)` (Line 282)
- Fetches user role if needed (cached)
- Runs **3 parallel API calls:**
  1. `validateIssuerAccess(issuerId, role)`
  2. `getUserRoleForIssuer(issuerId, role)`
  3. `getUserRolesForIssuer(issuerId)`

**On success:**
```
[AUTH] Setting state from validation - currentIssuer: abc-123, userRole: admin
[AUTH] Validation state set complete
[AUTH] Validation completed for: abc-123
```
- Sets state (same 4 setters as Path B)
- Caches result with timestamp
- Removes from in-progress: `validationInProgress.current.delete(issuerId)`

---

### **1️⃣2️⃣ STATE UPDATES FROM VALIDATION** ⚠️ **CRITICAL POINT**

**What changed:**
- `currentIssuer` = `{ issuer_id: 'abc-123', ... }`
- `issuerSpecificRole` = `'admin'`
- `userRoles` = `['admin', 'transfer_team']`
- Possibly `userRole` = `'admin'` (if different from global)

**What happens next - TWO SCENARIOS:**

#### **SCENARIO A: LOOP (If deps include issuer state)** ❌
```
🟣 [ISSUER-TRACK] useEffect TRIGGERED - currentIssuer: abc-123
🟣 [ISSUER-TRACK] Saving to localStorage: abc-123
🟣 [CONTEXT] useMemo CREATING NEW VALUE
🟡 [RKB-VALIDATE #2] useEffect TRIGGERED
🔵 [RKB-VALIDATE #2] Calling validateAndSetIssuer...
[AUTH] Using cached issuer validation
[AUTH] Setting state from cache
🟣 [ISSUER-TRACK] useEffect TRIGGERED
🟣 [CONTEXT] useMemo CREATING NEW VALUE
🟡 [RKB-VALIDATE #3] useEffect TRIGGERED
...INFINITE LOOP...
```

#### **SCENARIO B: NO LOOP (Current fix)** ✅
```
🟣 [ISSUER-TRACK] useEffect TRIGGERED - currentIssuer: abc-123
🟣 [ISSUER-TRACK] Saving to localStorage: abc-123
```
- `currentIssuer` changes
- `[ISSUER-TRACK]` useEffect runs (Line 84) - saves to localStorage
- **Context useMemo DOES NOT recreate** (currentIssuer not in deps)
- **No cascade re-renders**
- **Loop prevented** ✅

---

### **1️⃣3️⃣ VALIDATION COMPLETE**

```
🔵 [RKB-VALIDATE #1] validateAndSetIssuer returned, hasAccess: true
🟢 [RKB-VALIDATE #1] Validation successful, marking as validated
```
**What happens:**
- Sets `validatedIssuerRef.current = issuerId` (Line 446)
- **PREVENTS FUTURE RE-VALIDATIONS** for this issuer
- Effect won't run again unless:
  - `initialized` changes (won't happen)
  - `user` changes (sign out/in)
  - `issuerId` changes (navigate to different issuer)

---

### **1️⃣4️⃣ REALTIME SUBSCRIPTION SETUP**

```
🔌 Subscribing to realtime changes for issuer: abc-123
```
**What happens:**
- Supabase realtime channel subscribes (Line 297)
- Listens for changes to `transfers_new` table
- Filters by `issuer_id = abc-123`
- Dependencies: `[issuerId, mutateTransactions]`

**On transaction change:**
```
⚡ REALTIME EVENT: INSERT {eventType: 'INSERT', new: {...}}
➕ Optimistically adding new transaction: txn-456
✅ Optimistic update complete, background verification in progress
```

---

## 🔄 **WHEN SESSION RESUMES (After Refresh/Wake)**

### **If page refresh (CTRL+R):**
```
🔵 [AUTH-INIT] useEffect TRIGGERED
🔵 [INIT-AUTH] Starting...
🟢 [INIT-AUTH] Session found
🔵 [INIT-AUTH] Using cached role
🔵 [INIT-AUTH] Found 5 issuers
🟢 [INIT-AUTH] Complete
🟣 [CONTEXT] useMemo CREATING NEW VALUE
🔵 [RKB-PARAMS] useEffect TRIGGERED
🟢 [RKB-PARAMS] Got issuerId
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED
[AUTH] validateAndSetIssuer called
[AUTH] Using cached issuer validation
🟢 [RKB-VALIDATE #1] Validation successful
```
**EXPECTED:** One validation call, uses cache, no loop

### **If auth state change (token refresh):**
```
🟡 [AUTH-CHANGE] TOKEN_REFRESHED
```
- Should NOT trigger full re-init
- May update session state
- **Shouldn't trigger validation loop**

---

## 🚨 **LOOP DETECTION PATTERNS**

### **GOOD (No Loop):**
```
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED
🔵 [RKB-VALIDATE #1] Running validation
[AUTH] validateAndSetIssuer called
[AUTH] Using cached issuer validation
🟢 [RKB-VALIDATE #1] Validation successful
🟣 [ISSUER-TRACK] useEffect TRIGGERED
// STOPS HERE
```

### **BAD (Loop Detected):**
```
🟡 [RKB-VALIDATE #1] useEffect TRIGGERED
🔵 [RKB-VALIDATE #1] Running validation
[AUTH] validateAndSetIssuer called
🟣 [CONTEXT] useMemo CREATING NEW VALUE ⚠️ PROBLEM!
🟡 [RKB-VALIDATE #2] useEffect TRIGGERED ⚠️ LOOP!
🟣 [CONTEXT] useMemo CREATING NEW VALUE
🟡 [RKB-VALIDATE #3] useEffect TRIGGERED
🟣 [CONTEXT] useMemo CREATING NEW VALUE
... (repeats indefinitely)
```

**What to look for:**
- `[RKB-VALIDATE #N]` where N keeps increasing
- `[CONTEXT] useMemo CREATING NEW VALUE` after each validation
- `[ISSUER-TRACK]` firing multiple times

---

## 🐛 **DEBUGGING CHECKLIST**

### **1. Clear console, refresh page**
### **2. Count validation calls:**
- ✅ **GOOD:** 1 call (`#1`)
- ❌ **BAD:** 2+ calls (`#1`, `#2`, `#3`...)

### **3. Check context recreations:**
- ✅ **GOOD:** 1-2 times (init + after validation if userRole changed)
- ❌ **BAD:** 3+ times, especially after each validation

### **4. Check validation cache:**
- ✅ **GOOD:** "Using cached issuer validation"
- ❌ **BAD:** "Validating issuer access" (multiple times)

### **5. Check ISSUER-TRACK:**
- ✅ **GOOD:** Runs once when currentIssuer first set
- ❌ **BAD:** Runs multiple times in a loop

---

## 🔧 **CURRENT FIX STATUS**

### **What we fixed:**
1. ✅ Removed `currentIssuer`, `issuerSpecificRole`, `userRoles` from context useMemo deps
2. ✅ Added `validationInProgress` ref to prevent duplicate concurrent calls
3. ✅ Added `validatedIssuerRef` to prevent re-validation of same issuer

### **What should prevent loop:**
- Context value only recreates when `user`/`userRole`/`loading`/`initialized` change
- NOT when issuer-specific state changes
- Validation only runs once per issuer

### **If loop still happens, check:**
- Are callbacks in context deps (`hasPermission`, `canEdit`, etc.) recreating?
- Is `userRole` changing during validation (shouldn't happen)?
- Is something else triggering `user` or `availableIssuers` to change?

---

## 📊 **EXPECTED TIMELINE**

```
0ms    - App mounts
10ms   - Auth init starts
50ms   - Session retrieved
100ms  - User role fetched (or cached)
150ms  - Issuers fetched
200ms  - Auth state set → Context created → Pages render
250ms  - Params unwrapped → issuerId set
300ms  - Validation effect triggers
310ms  - validateAndSetIssuer called
320ms  - Cache hit → State set from cache
330ms  - Validation complete
340ms  - ISSUER-TRACK runs, saves to localStorage
350ms  - DONE ✅
```

**Total: ~350ms from mount to complete**

**No loop should happen after 350ms**

---

## 🎯 **USE THIS TO DEBUG**

1. Open browser console
2. Clear all logs
3. Refresh page or resume session
4. Copy ALL logs
5. Search for:
   - `[RKB-VALIDATE` - count how many
   - `[CONTEXT] useMemo` - should be minimal
   - Pattern matches above "BAD" examples

**Send me the logs and I'll find the exact issue.**
