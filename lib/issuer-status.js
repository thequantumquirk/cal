/**
 * Client-safe issuer status utilities
 * These can be safely imported in client components
 */

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
