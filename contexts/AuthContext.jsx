"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
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

  // Cache for issuer validation to prevent redundant database calls
  const issuerAccessCache = useRef(new Map())

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

      // Get user's role
      const role = await getCurrentUserRole()
      setUserRole(role)

      // Get user's available issuers
      const issuers = await getUserIssuers()
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

    // Refresh role + issuers
    const newRole = await getCurrentUserRole()
    setUserRole(newRole)
    const newIssuers = await getUserIssuers()
    setAvailableIssuers(newIssuers)

    // 🔑 Redirect logic
    if (newRole === "shareholder") {
      router.push("/shareholder-home")
    } else if (newRole === "admin" || newRole === "superadmin") {
      // Redirect to first available issuer's dashboard
      if (newIssuers && newIssuers.length > 0) {
        const firstIssuerId = newIssuers[0].issuer_id
        router.push(`/issuer/${firstIssuerId}/dashboard`)
      } else {
        // Fallback if no issuers available
        router.push("/issuers")
      }
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
  const validateAndSetIssuer = useCallback(async (issuerId) => {
    if (!user || !issuerId) return { hasAccess: false }

    // If we already have this issuer loaded, don't reload
    if (currentIssuer && currentIssuer.issuer_id === issuerId) {
      return { hasAccess: true, issuer: currentIssuer, userRole, issuerSpecificRole }
    }

    // Check cache first to avoid redundant validation
    const cached = issuerAccessCache.current.get(issuerId)
    if (cached && Date.now() - cached.timestamp < 300000) { // Cache for 5 minutes
      console.log('[AUTH] Using cached issuer validation for:', issuerId)
      setCurrentIssuer(cached.issuer)
      setUserRole(cached.userRole)
      setIssuerSpecificRole(cached.issuerSpecificRole)
      setUserRoles(cached.userRoles)
      return cached.result
    }

    try {
      console.log('[AUTH] Validating issuer access for:', issuerId)
      const { hasAccess, issuer, userRole: role } = await validateIssuerAccess(issuerId)

      if (!hasAccess) {
        return { hasAccess: false }
      }

      setCurrentIssuer(issuer)
      setUserRole(role)

      // Get issuer-specific role
      const specificRole = await getUserRoleForIssuer(issuerId)
      setIssuerSpecificRole(specificRole)

      // Get all user roles for this issuer
      const roles = await getUserRolesForIssuer(issuerId)
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

    const roleHierarchy = ['read_only', 'broker', 'shareholder', 'transfer_team', 'admin', 'superadmin']
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
    isBroker
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}