"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import useSWR from "swr"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import AsOfSearch from "@/components/as-of-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Search, Clock, TrendingUp, BarChart3, Filter, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

// ⚡ OPTIMIZED: Fetcher for SWR
const fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch')
  }
  return res.json()
}

// ⚡ OPTIMIZED: SWR config with 5-minute cache and deduplication
const swrConfig = {
  revalidateOnFocus: false,      // Don't refetch on window focus
  revalidateOnReconnect: false,  // Don't refetch on reconnect
  revalidateOnMount: true,       // Fetch on mount if no cache
  dedupingInterval: 300000,      // Dedupe requests within 5min (⚡ NO DUPLICATE CALLS)
  focusThrottleInterval: 300000, // Throttle focus revalidation to 5min
  refreshInterval: 0,            // No automatic refresh
  shouldRetryOnError: false,     // Don't retry on error
  errorRetryCount: 0,            // No retries
  revalidateIfStale: false,      // Don't revalidate stale data
}

export default function AsOfSearchPage({ params: paramsPromise }) {
  const { user, userRole, userRoles, currentIssuer, availableIssuers, issuerSpecificRole, loading, initialized, validateAndSetIssuer } = useAuth()
  const router = useRouter()
  const [issuerId, setIssuerId] = useState(null)

  // ⚡ OPTIMIZED: useRef guard to prevent duplicate execution
  const hasLoadedRef = useRef(false)

  // ⚡ OPTIMIZED: Single effect with ref guard - NO CASCADING EFFECTS
  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!initialized || !user) return

    const loadData = async () => {
      try {
        const params = await paramsPromise
        const id = params?.issuerId

        if (hasLoadedRef.current) return
        hasLoadedRef.current = true

        setIssuerId(id)

        if (!user) {
          router.push('/login')
          return
        }

        // ⚡ OPTIMIZED: Validation happens once, data fetching handled by SWR below
        const { hasAccess } = await validateAndSetIssuer(id)

        if (!hasAccess) {
          router.push('/?error=no_access')
          return
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [initialized, user])

  // ⚡ OPTIMIZED: SWR fetches and caches shareholders data
  // - Deduplicates API calls automatically
  // - Caches for 5 minutes (subsequent visits = 0 API calls)
  // - Only fetches when issuerId is available
  const { data: shareholders = [], mutate, isLoading } = useSWR(
    issuerId && userRole ? `/api/shareholders-historical?issuerId=${issuerId}` : null,
    fetcher,
    swrConfig
  )

  // ⚡ OPTIMIZED: Progressive loading - show UI immediately, only block on auth
  if (!initialized) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
        <Sidebar userRole={userRole} currentIssuerId={issuerId} issuerSpecificRole={issuerSpecificRole} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            userRole={userRole}
            userRoles={userRoles}
            currentIssuer={currentIssuer}
            availableIssuers={availableIssuers}
            issuerSpecificRole={issuerSpecificRole}
          />

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Historical Lookup...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      <Sidebar userRole={userRole} currentIssuerId={issuerId} issuerSpecificRole={issuerSpecificRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          userRole={userRole}
          userRoles={userRoles}
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-6">
              {/* Search Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Records</p>
                        {isLoading ? (
                          <div className="h-9 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                        ) : (
                          <p className="text-3xl font-bold text-gray-900">{shareholders.length}</p>
                        )}
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                        <Search className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Historical Data</p>
                        <p className="text-3xl font-bold text-gray-900">∞</p>
                        <p className="text-sm text-blue-600 flex items-center mt-2">
                          <Clock className="h-4 w-4 mr-1" />
                          Complete history
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Search Accuracy</p>
                        <p className="text-3xl font-bold text-gray-900">100%</p>
                        <p className="text-sm text-green-600 flex items-center mt-2">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Real-time data
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Search Interface */}
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                {/* Search Results */}
                <div className="lg:col-span-2">
                  <Card className="card-glass border-0">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900">Historical Search Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading shareholders data...</p>
                          </div>
                        </div>
                      ) : (
                        <AsOfSearch shareholders={shareholders} userRole={userRole} />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
