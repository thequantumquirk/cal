/**
 * Client-side utilities for auth operations
 * Fetches via API route to avoid server action import issues
 */

/**
 * Fetch auth data (role + issuers) with automatic caching
 * Uses server-side session cookies to avoid repeated DB queries
 *
 * @param {boolean} forceRefresh - Skip cache and fetch fresh from DB
 * @returns {Promise<{userRole: string, issuers: Array, isSuperAdmin: boolean, fromCache: boolean}>}
 */
export async function fetchAuthData(forceRefresh = false) {
  try {
    const response = await fetch(`/api/auth/session?refresh=${forceRefresh}`);
    if (!response.ok) {
      throw new Error(`Auth API failed: ${response.statusText}`);
    }
    const authData = await response.json();
    return authData;
  } catch (error) {
    console.error("[AUTH CLIENT] Error fetching auth data:", error);
    return {
      userRole: null,
      issuers: [],
      isSuperAdmin: false,
      fromCache: false,
      error: error.message,
    };
  }
}

/**
 * Invalidate auth cache and fetch fresh data
 * Use this when user's role or issuer access changes
 */
export async function refreshAuthData() {
  return await fetchAuthData(true);
}
