"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import useSWR from "swr"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import RolesTable from "@/components/roles-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Crown, Settings, Key, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RolesPage() {
  const { user, userRole, loading, initialized } = useAuth()
  const router = useRouter()

  // ⚡ SWR AGGRESSIVE CACHING
  const fetcher = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }

  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: true,
    dedupingInterval: 300000, // 5 min
    refreshInterval: 0,
    shouldRetryOnError: false,
    revalidateIfStale: false,
  }

  const { data: roles = [], mutate: mutateRoles, isLoading: rolesLoading } = useSWR(
    user && (userRole === 'superadmin' || userRole === 'admin') ? '/api/roles' : null,
    fetcher,
    swrConfig
  )

  // ⚡ FIX: Prevent infinite loop with ref guard
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!initialized) return

    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    if (!user) {
      router.push('/login')
      return
    }

    // Only superadmins and admins can access
    if (userRole && userRole !== 'superadmin' && userRole !== 'admin') {
      router.push('/')
      return
    }
  }, [initialized, user, userRole, router])

  // ⚡ PROGRESSIVE LOADING: Only block during auth init
  if (!initialized) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <Sidebar
        userRole={userRole}
        currentIssuerId={null}
        issuerSpecificRole={null}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          userRole={userRole}
          currentIssuer={null}
          availableIssuers={[]}
          issuerSpecificRole={null}
          userRoles={[]}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-6">
              {rolesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading roles...</p>
                  </div>
                </div>
              ) : (
                <Card className="card-glass border-0">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900">Roles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RolesTable roles={roles} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
