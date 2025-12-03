"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import useSWR from "swr"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import IssuersTable from "@/components/issuers-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, Plus, Users, Shield, Activity, Mail, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import ImportDataBox from "@/components/ImportDataBox"
import { toUSDate } from "@/lib/dateUtils"

export default function IssuersPage() {
  const { user, userRole, loading, initialized } = useAuth()
  const router = useRouter()

  // ⚡ Using shared SWR hooks - automatic caching and deduplication
  const { data: issuersData, mutate: mutateIssuers, isLoading: issuersLoading } = useSWR(
    user && userRole === 'superadmin' ? '/api/issuers' : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
      dedupingInterval: 300000,
      refreshInterval: 0,
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  )

  const { data: statistics, mutate: mutateStats, isLoading: statsLoading } = useSWR(
    user && userRole === 'superadmin' ? '/api/issuers/statistics' : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
      dedupingInterval: 300000,
      refreshInterval: 0,
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  )

  const { data: pendingInvitations = [], mutate: mutatePending, isLoading: pendingLoading } = useSWR(
    user && userRole === 'superadmin' ? '/api/invitations/pending' : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
      dedupingInterval: 300000,
      refreshInterval: 0,
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  )

  const pageLoading = issuersLoading || statsLoading || pendingLoading

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

    // Only super admins can access this page
    if (userRole && userRole !== 'superadmin') {
      router.push('/')
      return
    }
  }, [initialized, user, userRole, router])

  // ⚡ PROGRESSIVE LOADING: Only block during auth init
  if (!initialized) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </div>
    )
  }

  const issuers = issuersData || []
  const stats = statistics || { total_companies: 0, active_companies: 0, pending_invites: 0 }

  return (
    <div className="flex h-screen bg-background">
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
          availableIssuers={issuers}
          issuerSpecificRole={null}
          userRoles={[]}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {pageLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading issuers...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-muted/30 border border-border shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Issuers</p>
                          <p className="text-2xl font-bold text-foreground">{stats.total_companies}</p>
                        </div>
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                          <Building className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30 border border-border shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Issuers</p>
                          <p className="text-2xl font-bold text-green-600">{stats.active_companies}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                          <Activity className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30 border border-border shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                          <p className="text-2xl font-bold text-yellow-600">{stats.pending_invites}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                          <Mail className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                  <IssuersTable issuers={issuers} userRole={userRole} />
                  <ImportDataBox />
                </div>

                {/* Pending Invitations Section */}
                <Card className="bg-muted/30 border border-border shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-white" />
                        Pending Issuer Invitations
                      </h3>
                    </div>

                    {pendingInvitations.length === 0 ? (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No pending invites</p>
                        <p className="text-sm text-muted-foreground">All issuer admins have been invited</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingInvitations.map((invite) => (
                          <div key={invite.email} className="p-4 border border-border rounded-lg bg-background hover:bg-accent/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                                  <Building className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {invite.issuer_display_name || "Unknown Issuer"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {invite.name || "Issuer Admin"} • {invite.email}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">
                                  Invited {invite.invited_at ? toUSDate(invite.invited_at) : "Recently"}
                                </div>
                                <div className="px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full mt-1">
                                  Pending
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
