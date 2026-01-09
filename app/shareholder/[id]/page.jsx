"use client"

import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useRef } from "react"
import useSWR from "swr"
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

export default function ShareholderAdminPage() {
  const { id } = useParams()
  const { userRole, loading, initialized } = useAuth()
  const router = useRouter()

  // ⚡ OPTIMIZED: useRef guard
  const hasRedirectedRef = useRef(false)

  // ⚡ OPTIMIZED: Single effect for redirects
  useEffect(() => {
    if (hasRedirectedRef.current) return
    if (!initialized || loading) return

    // ✅ allow only admins / superadmins
    if (userRole !== "admin" && userRole !== "superadmin") {
      hasRedirectedRef.current = true
      router.push("/login")
      return
    }
  }, [initialized, loading, userRole, router])

  // ⚡ OPTIMIZED: SWR fetches and caches shareholder data
  const { data: shareholderData, isLoading, error } = useSWR(
    initialized && id && (userRole === "admin" || userRole === "superadmin")
      ? `/api/shareholder-data?shareholderId=${id}`
      : null,
    fetcher,
    swrConfig
  )

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

  // ✅ render dashboard (no signOut here)
  return (
    <ShareholderDashboard
      shareholderData={shareholderData}
      userRole={userRole}
    />
  )
}
