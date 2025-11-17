"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { validateIssuerAccess, getUserIssuers, getUserRoleForIssuer, getUserRolesForIssuer, getCurrentUserRole } from "@/lib/actions"

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
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

  // Cache for issuer validation to prevent redundant database calls
  const issuerAccessCache = useRef(new Map())

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
    if (currentIssuer) {
      saveLastIssuer(currentIssuer)
    }
  }, [currentIssuer, saveLastIssuer])

  // Initialize auth state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const supabase = createClient()

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session?.user) {
        setLoading(false)
        setInitialized(true)
        return
      }

      setUser(session.user)

      // ⚡ SUPER OPTIMIZED: Get role once, then pass to getUserIssuers (eliminates duplicate!)
      const role = await getCurrentUserRole()
      const issuers = await getUserIssuers(role)

      setUserRole(role)
      setAvailableIssuers(issuers)

      
      // Set up auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    setUser(null)
    setUserRole(null)
    setAvailableIssuers([])
    setCurrentIssuer(null)
    setIssuerSpecificRole(null)
    router.push('/login')
  } else if (event === 'SIGNED_IN' && session?.user) {
    setUser(session.user)

    // ⚡ SUPER OPTIMIZED: Get role once, then pass to getUserIssuers (eliminates duplicate!)
    const newRole = await getCurrentUserRole()
    const newIssuers = await getUserIssuers(newRole)

    setUserRole(newRole)
    setAvailableIssuers(newIssuers)

    // 🔑 Redirect logic - only redirect if we're on login or root page
    // Auth callback now handles redirecting to the correct destination
    const currentPath = window.location.pathname
    const isOnLoginOrRoot = currentPath === '/login' || currentPath === '/'

    if (!isOnLoginOrRoot) {
      // User is already on a specific page, don't redirect
      console.log('[AUTH] User signed in, already on correct page:', currentPath)
      return
    }

    // 🔄 Try to restore last visited route first
    const lastRoute = getLastRoute()

    // Redirect based on role hierarchy (highest priority first)
    if (newRole === "admin" || newRole === "superadmin" || newRole === "owner" || newRole === "transfer_team") {
      // ⚡ OPTIMIZED: Redirect directly to shareholder page to avoid loading heavy dashboard
      if (lastRoute && lastRoute.startsWith('/issuer/')) {
        console.log('[AUTH] Restoring last visited route:', lastRoute)
        router.push(lastRoute)
      } else if (newIssuers && newIssuers.length > 0) {
        // Redirect to first available issuer's shareholder page (lighter than dashboard)
        const firstIssuerId = newIssuers[0].issuer_id
        router.push(`/issuer/${firstIssuerId}/shareholder`)
      } else {
        // Fallback if no issuers available
        router.push("/issuers")
      }
    } else if (newRole === "broker") {
      router.push("/information")
    } else if (newRole === "shareholder") {
      router.push("/shareholder-home")
    } else {
      router.push("/") // fallback
    }
  }
})

        
     

      
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }

  // Validate access to specific issuer (memoized with useCallback + caching)
  const validateAndSetIssuer = useCallback(async (issuerId, forceReload = false) => {
    if (!user || !issuerId) return { hasAccess: false }

    // If we already have this issuer loaded, don't reload (unless forced)
    if (!forceReload && currentIssuer && currentIssuer.issuer_id === issuerId) {
      return { hasAccess: true, issuer: currentIssuer, userRole, issuerSpecificRole }
    }

    // Check cache first to avoid redundant validation
    const cached = issuerAccessCache.current.get(issuerId)
    if (cached && Date.now() - cached.timestamp < 300000) { // Cache for 5 minutes
      console.log('[AUTH] Using cached issuer validation for:', issuerId)
      // ⚡ OPTIMIZED: React 18 automatically batches these updates in the same execution context
      setCurrentIssuer(cached.issuer)
      setUserRole(cached.userRole)
      setIssuerSpecificRole(cached.issuerSpecificRole)
      setUserRoles(cached.userRoles)
      return cached.result
    }

    try {
      console.log('[AUTH] Validating issuer access for:', issuerId)

      // ⚡ SUPER OPTIMIZED: Get userRole once, then pass to all 3 functions to eliminate duplicate DB calls!
      const globalUserRole = await getCurrentUserRole()

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
      setCurrentIssuer(issuer)
      setUserRole(role)
      setIssuerSpecificRole(specificRole)
      setUserRoles(roles)

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
    }
  }, [user, currentIssuer, userRole, issuerSpecificRole])

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

  // Memoize the entire context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    user,
    userRole,
    availableIssuers,
    currentIssuer,
    issuerSpecificRole,
    userRoles,
    loading,
    initialized,

    // Methods
    validateAndSetIssuer,
    hasPermission,
    canEdit,
    isAdmin,
    isSuperAdmin,
    isBroker,
    getLastIssuer,

    // Setters for manual updates if needed
    setCurrentIssuer,
    setUserRole,
    setIssuerSpecificRole,
    setUserRoles
  }), [
    user,
    userRole,
    availableIssuers,
    currentIssuer,
    issuerSpecificRole,
    userRoles,
    loading,
    initialized,
    validateAndSetIssuer,
    hasPermission,
    canEdit,
    isAdmin,
    isSuperAdmin,
    isBroker,
    getLastIssuer
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}