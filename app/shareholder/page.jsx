"use client"

import { useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import useSWR from "swr"
import { signOut } from "@/lib/actions"
import ShareholderDashboard from "@/components/ShareholderDashboard"

// ⚡ OPTIMIZED: Fetcher for SWR
const fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// ⚡ OPTIMIZED: Aggressive SWR config for EXTRA SNAPPY experience
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateOnMount: true,
  dedupingInterval: 300000,      // 5 min cache
  focusThrottleInterval: 300000,
  refreshInterval: 0,
  shouldRetryOnError: false,
  errorRetryCount: 0,
  revalidateIfStale: false,
}

export default function ShareholderPage() {
  const { user, userRole, loading, initialized } = useAuth()
  const router = useRouter()
  const params = useParams()

  // ⚡ OPTIMIZED: useRef guard
  const hasRedirectedRef = useRef(false)

  // ⚡ OPTIMIZED: Single effect for redirects
  useEffect(() => {
    if (hasRedirectedRef.current) return
    if (!initialized || loading) return

    // 🚫 No valid role → force login
    if (
      userRole !== "shareholder" &&
      userRole !== "admin" &&
      userRole !== "superadmin"
    ) {
      hasRedirectedRef.current = true
      router.push("/login")
      return
    }

    // Shareholders should NOT access admin/superadmin pages
    if (userRole === "shareholder") {
      hasRedirectedRef.current = true
      router.push("/shareholder-home")
      return
    }
  }, [initialized, loading, userRole, router])

  // ⚡ OPTIMIZED: Build SWR key based on role and params
  const swrKey = (() => {
    if (!initialized || loading) return null
    if (userRole !== "admin" && userRole !== "superadmin") return null

    if (params?.id) {
      return `/api/shareholder-data?shareholderId=${params.id}`
    } else if (user?.email) {
      return `/api/shareholder-data?userEmail=${encodeURIComponent(user.email)}`
    }
    return null
  })()

  // ⚡ OPTIMIZED: SWR fetches and caches shareholder data
  const { data: shareholderData, isLoading, error } = useSWR(
    swrKey,
    fetcher,
    swrConfig
  )

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  // ⚡ OPTIMIZED: Progressive loading with skeleton
  if (!initialized || loading || isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-600">Loading Shareholder Data...</p>
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600">Error loading shareholder data</p>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ delegate all UI to the component
  return (
    <ShareholderDashboard
      shareholderData={shareholderData}
      userRole={userRole}
      onSignOut={handleSignOut}
    />
  )
}
