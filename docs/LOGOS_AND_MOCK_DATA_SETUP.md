# Logos and Mock Data - Current Setup

**Date**: October 30, 2025
**Status**: Using hardcoded logo and mock data for development

---

## Current Implementation

### 1. Logo Setup

**Current Approach**: Hardcoded Cal Redwood logo in all header locations

**File**: `components/header.jsx`

**Logo Path**: `/cal-redwood.jpg`

**Locations Updated** (4 total):
1. Main issuer logo (left side of header, lines 143-156)
2. Issuer switcher dropdown trigger button (lines 192-201)
3. Issuer switcher dropdown menu items (lines 218-227)
4. Single issuer display when no dropdown needed (lines 238-247)

**Code Pattern**:
```jsx
<img
  src="/cal-redwood.jpg"
  alt={currentIssuer.issuer_name}
  className="w-full h-full object-contain"
  onError={(e) => {
    e.target.style.display = 'none'
    e.target.nextSibling.style.display = 'flex'
  }}
/>
<Building className="h-3 w-3 text-gray-500" style={{ display: 'none' }} />
```

---

### 2. Securities Tab Mock Data

**Current Approach**: Using `getMockSecurities()` function instead of database

**Files Modified**:
- `lib/mock-data.js` - Added `getMockSecurities()` function (lines 382-458)
- `components/securities-tab.jsx` - Removed Supabase queries, now loads mock data

**Mock Data Contains** (12 entries):
- Major shareholders: Vingroup JSC (1,185,010,424 shares), VIG Partners (769,584,044), Asian Star (334,041,555)
- Individual shareholders: John Smith (5M), Sarah Johnson (2.5M), Michael Chen (1M), etc.
- Security types: Common Stock, Preferred Stock - Series A, Preferred Stock - Series B, Warrants

**Display Columns**:
1. Shareholder (name)
2. Type of Security (class name)
3. # of Securities (formatted with commas)

---

## Future Migration Path

### When Adding More Issuers

**Option 1: Database-driven logos (Recommended)**

1. Add `logo_url` column to `issuers_new` table:
```sql
ALTER TABLE issuers_new
ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

2. Upload logo files to `/public/` folder:
```
/public/
  ├── cal-redwood.jpg
  ├── issuer-2.jpg
  └── issuer-3.jpg
```

3. Update database with paths:
```sql
UPDATE issuers_new
SET logo_url = '/cal-redwood.jpg'
WHERE issuer_name = 'Cal Redwood';

UPDATE issuers_new
SET logo_url = '/issuer-2.jpg'
WHERE issuer_name = 'Issuer 2';
```

4. Update `components/header.jsx` to use dynamic logo:
```jsx
// Replace hardcoded path:
src="/cal-redwood.jpg"

// With database value:
src={currentIssuer.logo_url || "/placeholder-logo.png"}

// And update display logic:
style={{ display: currentIssuer.logo_url ? 'none' : 'flex' }}
```

**Option 2: Dynamic file mapping**

Create a logo mapping utility:
```javascript
// lib/logo-utils.js
export function getIssuerLogo(issuerName) {
  const logoMap = {
    'Cal Redwood': '/cal-redwood.jpg',
    'Issuer 2': '/issuer-2.jpg',
    'Issuer 3': '/issuer-3.jpg'
  }
  return logoMap[issuerName] || '/placeholder-logo.png'
}
```

Then update header:
```jsx
import { getIssuerLogo } from '@/lib/logo-utils'

<img src={getIssuerLogo(currentIssuer.issuer_name)} />
```

---

### When Connecting to Real Database for Securities

**File to Update**: `components/securities-tab.jsx`

**Replace this**:
```javascript
// Current mock data approach
import { getMockSecurities } from "@/lib/mock-data"

useEffect(() => {
  const loadMockData = () => {
    setTimeout(() => {
      const mockData = getMockSecurities()
      setSecurities(mockData)
      setLoading(false)
    }, 500)
  }
  loadMockData()
}, [issuerId])
```

**With this** (database query):
```javascript
import { createClient } from "@/lib/supabase/client"

useEffect(() => {
  if (!issuerId) return

  const fetchSecurities = async () => {
    const supabase = createClient()

    const { data: positions, error } = await supabase
      .from("shareholder_positions_new")
      .select(`
        shares_owned,
        shareholders_new (
          first_name,
          last_name
        ),
        securities_new (
          class_name
        )
      `)
      .eq("issuer_id", issuerId)
      .order("shares_owned", { ascending: false })

    if (error) {
      console.error("Error fetching securities:", error)
      setSecurities([])
      setLoading(false)
      return
    }

    const formattedData = positions
      .filter(pos => (pos.shares_owned || 0) > 0)
      .map(position => ({
        shareholder: `${position.shareholders_new?.first_name || ''} ${position.shareholders_new?.last_name || ''}`.trim() || 'Unknown',
        typeOfSecurity: position.securities_new?.class_name || 'Unknown',
        numSecurities: position.shares_owned || 0
      }))

    setSecurities(formattedData)
    setLoading(false)
  }

  fetchSecurities()
}, [issuerId])
```

---

## Related Documentation

- **Complete dashboard redesign**: See `docs/DASHBOARD_REDESIGN_SUMMARY.md`
- **API vendors for real data**: See `docs/API_VENDORS_COMPARISON.md`
- **Database schema**: See conversation history for table structures

---

## Quick Reference

### Current File Structure
```
/public/
└── cal-redwood.jpg          # Cal Redwood logo (hardcoded)

/components/
├── header.jsx                # Uses hardcoded cal-redwood.jpg
└── securities-tab.jsx        # Uses getMockSecurities()

/lib/
└── mock-data.js              # Contains getMockSecurities() function

/docs/
├── DASHBOARD_REDESIGN_SUMMARY.md
├── API_VENDORS_COMPARISON.md
└── LOGOS_AND_MOCK_DATA_SETUP.md    # This file
```

### Search Keywords for Future Updates
- `cal-redwood.jpg` - Find all hardcoded logo references
- `getMockSecurities` - Find mock securities data usage
- `logo_url` - Database column for issuer logos
- `shareholder_positions_new` - Real database table for securities

---

**Note**: All other dashboard tabs (Home, Shareholders) already use mock data from `lib/mock-data.js`. When connecting to real APIs, update those functions in the same file.
