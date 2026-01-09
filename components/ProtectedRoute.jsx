"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function ProtectedRoute({ children, requireIssuer = false, issuerId = null }) {
  const { user, loading: authLoading, validateAndSetIssuer, initialized, availableIssuers } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const router = useRouter()

  const checkAccess = useCallback(async () => {
    if (!initialized) return

    // If no user and auth is loaded, redirect to login
    if (!user && !authLoading) {
      router.push('/login')
      return
    }

    // If we have a user but need issuer validation
    if (user && requireIssuer && issuerId) {
      try {
        const { hasAccess: issuerAccess } = await validateAndSetIssuer(issuerId)
        if (!issuerAccess) {
          // Redirect to primary issuer instead of error page
          if (availableIssuers && availableIssuers.length > 0) {
            const primaryIssuerId = availableIssuers[0].issuer_id
            const currentPath = window.location.pathname
            const pathSegments = currentPath.split('/')

            // Replace the issuer ID in the path with the primary issuer
            if (pathSegments[1] === 'issuer' && pathSegments[2]) {
              pathSegments[2] = primaryIssuerId
              const newPath = pathSegments.join('/')
              router.push(newPath)
            } else {
              // Default fallback to primary issuer's shareholder page
              router.push(`/issuer/${primaryIssuerId}/shareholder`)
            }
          } else {
            router.push('/?error=no_access')
          }
          return
        }
        setHasAccess(true)
      } catch (error) {
        console.error('Error validating issuer access:', error)
        router.push('/?error=access_error')
        return
      }
    } else if (user) {
      setHasAccess(true)
    }

    setLoading(false)
  }, [initialized, user, authLoading, requireIssuer, issuerId, validateAndSetIssuer, availableIssuers, router])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  if (loading || authLoading || !initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || (requireIssuer && !hasAccess)) {
    return null // Will redirect in useEffect
  }

  return children
}