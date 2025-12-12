# Restriction Template Caching Fix Summary

## Problem
Restriction template edits were updating the database successfully but the UI wasn't reflecting changes in production due to multiple layers of caching.

## Root Causes Identified

### 1. API Response Caching (Critical)
- **GET endpoint** was caching responses for 5 minutes (`s-maxage=300`)
- **PUT/POST endpoints** had no cache-control headers
- Browser/CDN was serving stale cached data even after successful updates

### 2. Overly Aggressive SWR Config (Critical)
- `revalidateIfStale: false` prevented SWR from revalidating stale data
- `dedupingInterval: 300000` (5 minutes) prevented refetching
- Even when `mutate()` was called, stale data wasn't being refreshed

### 3. Missing Cache-Busting Headers
- Fetcher wasn't sending `Cache-Control: no-cache` headers
- Browser cache was being used instead of fresh data

### 4. Poor Error Handling
- Errors were silently logged to console
- Users had no visibility into failures

## Fixes Applied

### 1. API Layer (`app/api/restriction-templates/route.js`)

**GET Endpoint (Lines 37-44):**
```javascript
// Changed from: 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
// To:
return NextResponse.json(templates || [], {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
})
```

**POST Endpoint (Lines 87-93):**
```javascript
return NextResponse.json(template, {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
})
```

**PUT Endpoint (Lines 151-158):**
```javascript
return NextResponse.json(template, {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
})
```

### 2. Frontend SWR Configuration (`app/issuer/[issuerId]/restrictions/page.jsx`)

**Fetcher with Cache-Busting (Lines 78-89):**
```javascript
const fetcher = async (url) => {
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  });
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};
```

**SWR Config (Lines 91-102):**
```javascript
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateOnMount: true,
  dedupingInterval: 2000,        // Reduced from 300000ms (5min) to 2s
  focusThrottleInterval: 60000,  // Reduced from 300000ms to 60s
  refreshInterval: 0,
  shouldRetryOnError: false,
  errorRetryCount: 0,
  revalidateIfStale: true,       // CRITICAL: Changed from false to true
};
```

### 3. Update Function with Optimistic Updates (Lines 253-299)

**Before:**
```javascript
await mutateTemplates(undefined, { revalidate: true });
```

**After:**
```javascript
// Optimistic update
const optimisticData = restrictionTemplates.map(template =>
  template.id === templateId ? { ...template, ...newData } : template
);

// Fetch with cache-busting headers
const response = await fetch("/api/restriction-templates", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
  body: JSON.stringify(data),
});

// Error handling
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || `Server error: ${response.status}`);
}

// Force fresh data fetch
await mutateTemplates(
  async () => {
    const res = await fetch(`/api/restriction-templates?issuerId=${issuerId}`, {
      headers: { "Cache-Control": "no-cache" }
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },
  { revalidate: false }
);

// User-visible error messages
alert(`Failed to update template: ${error.message}`);
```

### 4. Create Function Improvements (Lines 209-251)
- Added cache-busting headers to POST request
- Force fresh data fetch after creation
- Better error handling with user alerts

## Testing Checklist

### In Development
- [x] Edit a restriction template
- [x] Verify UI updates immediately
- [x] Check browser DevTools Network tab shows no cached responses
- [x] Verify database is updated

### In Production (After Deploy)
- [ ] Edit a restriction template
- [ ] Verify UI updates immediately (no refresh needed)
- [ ] Check browser console for success messages (✅)
- [ ] Try editing multiple times in succession
- [ ] Test with multiple browser tabs open
- [ ] Clear browser cache and test again

## Cache-Control Headers Explained

| Header | Purpose |
|--------|---------|
| `no-store` | Don't store in any cache (browser or CDN) |
| `no-cache` | Cache but revalidate every time before use |
| `must-revalidate` | Once stale, must revalidate before use |
| `proxy-revalidate` | Same as must-revalidate but for CDN/proxies |
| `Pragma: no-cache` | HTTP/1.0 backward compatibility |
| `Expires: 0` | Mark as immediately expired |

## Key Changes Summary

1. ✅ **API**: No caching on GET/POST/PUT endpoints
2. ✅ **Fetcher**: Cache-busting headers on all requests
3. ✅ **SWR Config**: `revalidateIfStale: true` (was `false`)
4. ✅ **Deduping**: Reduced from 5 minutes to 2 seconds
5. ✅ **Update Logic**: Force fresh fetch with cache-busting
6. ✅ **Error Handling**: User-visible error messages
7. ✅ **Optimistic Updates**: UI updates immediately

## Performance Impact

**Before:**
- First load: Fast (cached)
- After update: Stale data shown (BAD)
- User experience: Confusing

**After:**
- First load: Slightly slower (no cache)
- After update: Fresh data immediately (GOOD)
- User experience: Reliable and predictable

## Files Modified

1. `/Users/bala/eff/app/api/restriction-templates/route.js`
   - Added no-cache headers to GET, POST, PUT endpoints

2. `/Users/bala/eff/app/issuer/[issuerId]/restrictions/page.jsx`
   - Updated fetcher with cache-busting headers
   - Fixed SWR config (`revalidateIfStale: true`)
   - Improved update/create functions
   - Added proper error handling

## Deployment Notes

1. Deploy API changes first
2. Deploy frontend changes second
3. Consider clearing CDN cache after deployment
4. Monitor production logs for any errors
5. Test thoroughly in production after deployment

## Rollback Plan

If issues occur, revert these commits:
```bash
git log --oneline -5  # Find the commit hashes
git revert <commit-hash>
```

The old behavior had 5-minute caching which, while causing stale data issues, was stable.
