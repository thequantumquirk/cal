"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { validateIssuerAccess, getUserIssuers, getUserRoleForIssuer, getUserRolesForIssuer, getCurrentUserRole } from "@/lib/actions"
import { useQueryClient } from "@tanstack/react-query"
import { issuerDataKeys } from "@/hooks/use-issuer-data"

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  console.log('🚀🚀🚀 [AUTH-PROVIDER] COMPONENT RENDERING 🚀🚀🚀');

  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [availableIssuers, setAvailableIssuers] = useState([])
  const [currentIssuer, setCurrentIssuer] = useState(null)
  const [issuerSpecificRole, setIssuerSpecificRole] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  console.log('🚀 [AUTH-PROVIDER] State initialized - loading:', true, 'initialized:', false);

  // Cache for issuer validation to prevent redundant database calls
  const issuerAccessCache = useRef(new Map())

  // 🚀 ULTRA FAST: Cache user role to avoid redundant database calls
  const userRoleCache = useRef(null)

  // ⚡ CRITICAL: Track ongoing validations to prevent duplicate calls
  const validationInProgress = useRef(new Set())

  // Store last visited route in localStorage
  const saveLastRoute = useCallback((path) => {
    if (typeof window !== 'undefined' && path && path !== '/login' && path !== '/') {
      localStorage.setItem('lastVisitedRoute', path)
    }
  }, [])

  // Get last visited route from localStorage
  const getLastRoute = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastVisitedRoute')
    }
    return null
  }, [])

  // Store last selected issuer in localStorage
  const saveLastIssuer = useCallback((issuer) => {
    if (typeof window !== 'undefined' && issuer) {
      localStorage.setItem('lastSelectedIssuer', JSON.stringify({
        issuer_id: issuer.issuer_id,
        issuer_name: issuer.issuer_name || issuer.display_name,
        display_name: issuer.display_name
      }))
    }
  }, [])

  // Get last selected issuer from localStorage
  const getLastIssuer = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastSelectedIssuer')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          return null
        }
      }
    }
    return null
  }, [])

  // Track route changes and save to localStorage
  useEffect(() => {
    if (pathname) {
      saveLastRoute(pathname)
    }
  }, [pathname, saveLastRoute])

  // Track current issuer and save to localStorage
  useEffect(() => {
    console.log('🟣 [ISSUER-TRACK] useEffect TRIGGERED - currentIssuer:', currentIssuer?.issuer_id || 'null');
    if (currentIssuer) {
      console.log('🟣 [ISSUER-TRACK] Saving to localStorage:', currentIssuer.issuer_id);
      saveLastIssuer(currentIssuer)
    }
  }, [currentIssuer, saveLastIssuer])

  // Initialize auth state
  useEffect(() => {
    console.log('🔵🔵🔵 [AUTH-INIT] useEffect TRIGGERED - Setting up auth 🔵🔵🔵');
    let mounted = true;

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🟡 [AUTH-CHANGE]', event, '- hasSession:', !!session)

      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session) {
        if (event === 'INITIAL_SESSION' && !session) {
          console.log('⚪ [AUTH-CHANGE] No session on init');
          setLoading(false);
          setInitialized(true);
        } else if (event === 'SIGNED_OUT') {
          console.log('🔴 [AUTH-CHANGE] SIGNED_OUT - Clearing auth state')
          setUser(null)
          setUserRole(null)
          setAvailableIssuers([])
          setCurrentIssuer(null)
          setIssuerSpecificRole(null)
          userRoleCache.current = null
          issuerAccessCache.current.clear()
          setLoading(false)
          setInitialized(true)
          router.push('/login')
        }
        return
      }

      // Handle session active (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED)
      if (session?.user) {
        console.log('🟢 [AUTH-CHANGE] Session active for:', session.user.id)
        setUser(session.user)

        // 🚀 CRITICAL: Invalidate role cache on refresh or update to catch role changes (like onboarding)
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          console.log(`🔵 [AUTH-CHANGE] Event ${event} triggered - clearing role cache`);
          userRoleCache.current = null;
        }

        try {
          // 🚀 ULTRA FAST: Use cached role if available
          let newRole = userRoleCache.current
          if (!newRole) {
            console.log('🔵 [AUTH-CHANGE] Fetching user role...')
            newRole = await getCurrentUserRole()
            userRoleCache.current = newRole
          }

          console.log('🔵 [AUTH-CHANGE] Fetching user issuers...')
          const newIssuers = await getUserIssuers(newRole)

          if (mounted) {
            setUserRole(newRole)
            setAvailableIssuers(newIssuers)
            setLoading(false)
            setInitialized(true)
          }

          // Handle Redirects for SIGNED_IN event
          if (event === 'SIGNED_IN') {
            const isOAuthCallback = typeof window !== 'undefined' && window.location.search.includes('login=returning')
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
            const isOnLoginOrRoot = currentPath === '/login' || currentPath === '/'

            if (!isOnLoginOrRoot) {
              if (isOAuthCallback) {
                setTimeout(() => router.refresh(), 300)
              }
              return
            }

            const lastRoute = getLastRoute()
            if (newRole === "admin" || newRole === "superadmin" || newRole === "owner" || newRole === "transfer_team") {
              if (lastRoute && lastRoute.startsWith('/issuer/')) {
                router.push(lastRoute)
                setTimeout(() => router.refresh(), 100)
              } else if (newIssuers && newIssuers.length > 0) {
                router.push(`/issuer/${newIssuers[0].issuer_id}/shareholder`)
                setTimeout(() => router.refresh(), 500)
              } else {
                router.push("/issuers")
              }
            } else if (newRole === "broker") {
              router.push("/information")
            } else if (newRole === "shareholder") {
              router.push("/shareholder-home")
            } else {
              router.push("/")
            }

            // 🚀 PERFORMANCE: Prefetch dashboard data for first issuer in background (non-blocking)
            // This runs AFTER all auth logic completes - failures won't affect auth flow
            if (newIssuers && newIssuers.length > 0 && (newRole === "admin" || newRole === "superadmin" || newRole === "owner" || newRole === "transfer_team")) {
              const firstIssuerId = newIssuers[0].issuer_id

              // Fire and forget - don't await, don't block anything
              Promise.all([
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.shareholders(firstIssuerId),
                  queryFn: async () => {
                    const res = await fetch(`/api/shareholders?issuerId=${firstIssuerId}`)
                    if (!res.ok) throw new Error('Failed to prefetch shareholders')
                    return res.json()
                  },
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.securities(firstIssuerId),
                  queryFn: async () => {
                    const res = await fetch(`/api/securities?issuerId=${firstIssuerId}`)
                    if (!res.ok) throw new Error('Failed to prefetch securities')
                    return res.json()
                  },
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.transactions(firstIssuerId),
                  queryFn: async () => {
                    const res = await fetch(`/api/record-keeping-transactions?issuerId=${firstIssuerId}`)
                    if (!res.ok) throw new Error('Failed to prefetch transactions')
                    return res.json()
                  },
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.issuer(firstIssuerId),
                  queryFn: async () => {
                    const res = await fetch(`/api/issuers/${firstIssuerId}`)
                    if (!res.ok) throw new Error('Failed to prefetch issuer')
                    return res.json()
                  },
                  staleTime: 300000,
                }),
              ]).catch(err => {
                // Fail silently - prefetch is optional and shouldn't affect auth flow
                console.warn('[AUTH] Prefetch failed (non-critical):', err)
              })
            }
          }
        } catch (error) {
          console.error('Error in auth change handler:', error)
          if (mounted) {
            setLoading(false)
            setInitialized(true)
          }
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [queryClient, router])

  // Validate access to specific issuer (memoized with useCallback + caching)
  // ⚡ CRITICAL: This function is stable - only recreates when user changes
  // It does NOT depend on userRole/issuerSpecificRole to avoid infinite loops
  // (since this function SETS those values, depending on them causes loops)
  const validateAndSetIssuer = useCallback(async (issuerId, forceReload = false) => {
    console.log('[AUTH] validateAndSetIssuer called for:', issuerId, 'user:', !!user, 'forceReload:', forceReload);

    if (!user || !issuerId) {
      console.log('[AUTH] No user or issuerId, returning false');
      return { hasAccess: false }
    }

    // ⚡ CRITICAL: Prevent duplicate concurrent validations for same issuer
    if (validationInProgress.current.has(issuerId)) {
      console.log('[AUTH] Validation already in progress for:', issuerId, '- WAITING for completion');
      // Wait for the ongoing validation by polling cache with timeout
      const maxWaitTime = 5000; // 5 seconds max wait
      const pollInterval = 100; // Check every 100ms
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const cached = issuerAccessCache.current.get(issuerId);
        if (cached && !validationInProgress.current.has(issuerId)) {
          console.log('[AUTH] Concurrent validation completed, using cached result');
          // Also update state from cache
          setCurrentIssuer(cached.issuer);
          setUserRole(cached.userRole);
          setIssuerSpecificRole(cached.issuerSpecificRole);
          setUserRoles(cached.userRoles);
          return cached.result;
        }
      }

      // Timeout reached - validation is taking too long, proceed with fresh validation
      console.warn('[AUTH] Concurrent validation timeout, proceeding with fresh validation');
    }

    // Check cache first to avoid redundant validation
    const cached = issuerAccessCache.current.get(issuerId)
    if (!forceReload && cached && Date.now() - cached.timestamp < 300000) { // Cache for 5 minutes
      console.log('[AUTH] Using cached issuer validation for:', issuerId)
      console.log('[AUTH] Setting state from cache - currentIssuer:', cached.issuer?.issuer_id, 'userRole:', cached.userRole);
      // ⚡ OPTIMIZED: React 18 automatically batches these updates in the same execution context
      setCurrentIssuer(cached.issuer)
      setUserRole(cached.userRole)
      setIssuerSpecificRole(cached.issuerSpecificRole)
      setUserRoles(cached.userRoles)
      console.log('[AUTH] Cache state set complete');
      return cached.result
    }

    // Mark validation as in progress
    validationInProgress.current.add(issuerId);

    try {
      console.log('[AUTH] Validating issuer access for:', issuerId)

      // 🚀 ULTRA FAST: Use cached role if available, otherwise fetch
      let globalUserRole = userRoleCache.current
      if (!globalUserRole) {
        globalUserRole = await getCurrentUserRole()
        userRoleCache.current = globalUserRole
      }

      // ⚡ Fetch all 3 auth checks in parallel with shared userRole (3x faster + no duplicates!)
      const [accessResult, specificRole, roles] = await Promise.all([
        validateIssuerAccess(issuerId, globalUserRole),
        getUserRoleForIssuer(issuerId, globalUserRole),
        getUserRolesForIssuer(issuerId)
      ])

      const { hasAccess, issuer, userRole: role } = accessResult

      if (!hasAccess) {
        return { hasAccess: false }
      }

      // ⚡ OPTIMIZED: React 18 automatically batches these updates since they're in the same async context
      console.log('[AUTH] Setting state from validation - currentIssuer:', issuer?.issuer_id, 'userRole:', role);
      setCurrentIssuer(issuer)
      setUserRole(role)
      setIssuerSpecificRole(specificRole)
      setUserRoles(roles)
      console.log('[AUTH] Validation state set complete');

      const result = { hasAccess: true, issuer, userRole: role, issuerSpecificRole: specificRole, userRoles: roles }

      // Cache the result
      issuerAccessCache.current.set(issuerId, {
        result,
        issuer,
        userRole: role,
        issuerSpecificRole: specificRole,
        userRoles: roles,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      console.error('Error validating issuer access:', error)
      return { hasAccess: false }
    } finally {
      // ⚡ CRITICAL: Always remove from in-progress set
      validationInProgress.current.delete(issuerId);
      console.log('[AUTH] Validation completed for:', issuerId);
    }
  }, [user])

  // Check if user has permission (memoized with useCallback)
  const hasPermission = useCallback((requiredRole) => {
    if (!userRole) return false

    const roleHierarchy = ['read_only', 'shareholder', 'broker', 'transfer_team', 'admin', 'superadmin']
    const userRoleIndex = roleHierarchy.indexOf(userRole)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

    return userRoleIndex >= requiredRoleIndex
  }, [userRole])

  // Check if user is a broker (memoized with useCallback)
  const isBroker = useCallback(() => {
    return hasPermission('broker')
  }, [hasPermission])

  // Check if user can edit (memoized with useCallback)
  const canEdit = useCallback(() => {
    return hasPermission('transfer_team')
  }, [hasPermission])

  // Check if user is admin or higher (memoized with useCallback)
  const isAdmin = useCallback(() => {
    return hasPermission('admin')
  }, [hasPermission])

  // Check if user is superadmin (memoized with useCallback)
  const isSuperAdmin = useCallback(() => {
    return userRole === 'superadmin'
  }, [userRole])

  // Check if current issuer is suspended (read-only mode)
  const isIssuerSuspended = useCallback(() => {
    return currentIssuer?.status === 'suspended'
  }, [currentIssuer])

  // Check if current issuer is pending (onboarding mode - transactions disabled)
  const isIssuerPending = useCallback(() => {
    return currentIssuer?.status === 'pending'
  }, [currentIssuer])

  // Check if transactions are blocked for current issuer (suspended OR pending)
  const areTransactionsBlocked = useCallback(() => {
    return currentIssuer?.status === 'suspended' || currentIssuer?.status === 'pending'
  }, [currentIssuer])

  // ⚡ OPTIMIZED: Memoize context value with STABLE dependencies
  // Include issuer-specific state to ensure consumers get fresh values
  const value = useMemo(() => {
    console.log('🟣 [CONTEXT] useMemo CREATING NEW VALUE - user:', !!user, 'userRole:', userRole, 'currentIssuer:', currentIssuer?.issuer_id, 'loading:', loading, 'initialized:', initialized);
    return {
      // State - Core user state (stable)
      user,
      userRole,
      availableIssuers,
      loading,
      initialized,

      // State - Issuer-specific (must be included for consumers to get fresh values)
      currentIssuer,
      issuerSpecificRole,
      userRoles,

      // Methods - All stable callbacks
      validateAndSetIssuer,
      hasPermission,
      canEdit,
      isAdmin,
      isSuperAdmin,
      isIssuerSuspended,
      isIssuerPending,
      areTransactionsBlocked,
      isBroker,
      getLastIssuer,

      // Setters for manual updates if needed
      setCurrentIssuer,
      setUserRole,
      setIssuerSpecificRole,
      setUserRoles
    }
  }, [
    // ⚡ CRITICAL: Include all values that components need to react to
    user,
    userRole,
    availableIssuers,
    loading,
    initialized,
    // ✅ ADDED: Issuer-specific state so consumers get updates
    currentIssuer,
    issuerSpecificRole,
    userRoles,
    // ✅ ADDED: Stable callbacks (these are created with useCallback so won't cause loops)
    validateAndSetIssuer,
    hasPermission,
    canEdit,
    isAdmin,
    isSuperAdmin,
    isIssuerSuspended,
    isIssuerPending,
    areTransactionsBlocked,
    isBroker,
    getLastIssuer
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}