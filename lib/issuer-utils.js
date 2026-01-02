/**
 * Issuer utility functions for status management and access control
 */

/**
 * Check if an issuer allows write operations (data setup)
 * Suspended issuers are read-only
 * Pending issuers allow data setup but not transactions
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} issuerId - The issuer ID to check
 * @returns {Promise<{allowed: boolean, reason?: string, status?: string}>}
 */
export async function checkIssuerWriteAccess(supabase, issuerId) {
  if (!issuerId) {
    return { allowed: false, reason: 'No issuer ID provided' }
  }

  try {
    const { data: issuer, error } = await supabase
      .from("issuers_new")
      .select("id, status")
      .eq("id", issuerId)
      .single()

    // If error querying (e.g., status column doesn't exist), allow write
    if (error) {
      // Check if it's a column not found error - if so, allow (status feature not yet enabled)
      if (error.code === '42703') {
        console.warn('Status column not found - allowing write access')
        return { allowed: true, status: 'active' }
      }
      // For other errors (like issuer not found), deny
      return { allowed: false, reason: 'Issuer not found' }
    }

    if (!issuer) {
      return { allowed: false, reason: 'Issuer not found' }
    }

    // If status is null or undefined, treat as active
    const status = issuer.status || 'active'

    if (status === 'suspended') {
      return {
        allowed: false,
        reason: 'Issuer is suspended - read-only mode',
        status: status
      }
    }

    // Pending issuers allow data setup (write access for issuer info, shareholders, restrictions)
    return { allowed: true, status: status }
  } catch (err) {
    // On any unexpected error, allow write to not break existing functionality
    console.error('Error checking issuer write access:', err)
    return { allowed: true, status: 'active' }
  }
}

/**
 * Check if an issuer allows transaction operations (movements)
 * Both suspended AND pending issuers block transactions
 * Pending issuers are in onboarding mode - data can be set up but no transactions until live
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} issuerId - The issuer ID to check
 * @returns {Promise<{allowed: boolean, reason?: string, status?: string}>}
 */
export async function checkIssuerTransactionAccess(supabase, issuerId) {
  if (!issuerId) {
    return { allowed: false, reason: 'No issuer ID provided' }
  }

  try {
    const { data: issuer, error } = await supabase
      .from("issuers_new")
      .select("id, status")
      .eq("id", issuerId)
      .single()

    if (error) {
      if (error.code === '42703') {
        console.warn('Status column not found - allowing transaction access')
        return { allowed: true, status: 'active' }
      }
      return { allowed: false, reason: 'Issuer not found' }
    }

    if (!issuer) {
      return { allowed: false, reason: 'Issuer not found' }
    }

    const status = issuer.status || 'active'

    if (status === 'suspended') {
      return {
        allowed: false,
        reason: 'Issuer is suspended - read-only mode',
        status: status
      }
    }

    if (status === 'pending') {
      return {
        allowed: false,
        reason: 'Issuer is pending activation - transactions are disabled until live',
        status: status
      }
    }

    return { allowed: true, status: status }
  } catch (err) {
    console.error('Error checking issuer transaction access:', err)
    return { allowed: true, status: 'active' }
  }
}

/**
 * Check if user is a super admin
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>}
 */
export async function checkIsSuperAdmin(supabase, userId) {
  if (!userId) return false

  const { data: userData } = await supabase
    .from("users_new")
    .select("is_super_admin")
    .eq("id", userId)
    .single()

  return userData?.is_super_admin === true
}

/**
 * Issuer status constants
 */
export const ISSUER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
}

export const ISSUER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', description: 'Live on the platform - all transactions enabled' },
  { value: 'pending', label: 'Pending', description: 'Onboarding mode - data setup only, no transactions' },
  { value: 'suspended', label: 'Suspended', description: 'Left the platform (read-only)' }
]

/**
 * Required fields for an issuer to go live
 * These are checked before allowing status change from pending to active
 */
export const ISSUER_REQUIRED_FIELDS = {
  // Basic Info
  issuer_name: { label: 'Issuer Name', category: 'basic' },
  display_name: { label: 'Display Name', category: 'basic' },
  address: { label: 'Address', category: 'basic' },
  telephone: { label: 'Telephone', category: 'basic' },
  tax_id: { label: 'Tax ID', category: 'basic' },

  // Regulatory Info
  ticker_symbol: { label: 'Ticker Symbol', category: 'regulatory' },

  // Separation/Split Info
  separation_ratio: { label: 'Separation Ratio', category: 'separation' },
}

/**
 * Check which required fields are missing for an issuer
 * @param {object} issuer - The issuer object
 * @returns {Array<{field: string, label: string, category: string}>} Missing fields
 */
export function getIssuerMissingFields(issuer) {
  if (!issuer) return Object.entries(ISSUER_REQUIRED_FIELDS).map(([field, info]) => ({
    field,
    ...info
  }))

  const missing = []
  for (const [field, info] of Object.entries(ISSUER_REQUIRED_FIELDS)) {
    const value = issuer[field]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push({ field, ...info })
    }
  }
  return missing
}

/**
 * Check if issuer has minimum requirements to go live
 * @param {object} issuer - The issuer object
 * @returns {{ready: boolean, missing: Array, message?: string}}
 */
export function checkIssuerGoLiveReady(issuer) {
  const missing = getIssuerMissingFields(issuer)

  if (missing.length === 0) {
    return { ready: true, missing: [] }
  }

  const categories = [...new Set(missing.map(m => m.category))]
  const message = `Missing ${missing.length} required field${missing.length > 1 ? 's' : ''} in: ${categories.join(', ')}`

  return { ready: false, missing, message }
}
