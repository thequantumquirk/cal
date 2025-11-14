"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import useSWR from "swr"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"

// Dynamic import for heavy table component
const ShareholdersTable = dynamic(() => import("@/components/shareholders-table"), {
  ssr: false,
  loading: () => <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"></div></div>
})
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Search, Filter, Download, Plus, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

async function getShareholders(issuerId, userRole) {
  const supabase = createClient()

  console.log(`[DEBUG] getShareholders called with issuerId: ${issuerId}, userRole: ${userRole}`)

  // For superadmins without issuer context, show global data
  if (userRole === 'superadmin' && !issuerId) {
    console.log("[DEBUG] Fetching all shareholders for superadmin without issuer context")
    const { data: shareholders, error } = await supabase
      .from("shareholders_new")
      .select("*, issuers_new(issuer_name)")
      .order("last_name")

    if (error) {
      console.error("Error fetching all shareholders:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return []
    }
    console.log(`[DEBUG] Found ${shareholders?.length || 0} shareholders globally`)
    return shareholders || []
  }

  // For issuer-specific data
  if (!issuerId) {
    console.log("[DEBUG] No issuer ID provided, returning empty array")
    return [] // No issuer selected, no data
  }

  console.log(`[DEBUG] Fetching shareholders for issuer: ${issuerId}`)
  const { data: shareholders, error } = await supabase
    .from("shareholders_new")
    .select("*, issuers_new(issuer_name)")
    .eq("issuer_id", issuerId)
    .order("last_name")

  if (error) {
    console.error(`Error fetching shareholders for issuer ${issuerId}:`, error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    return []
  }

  console.log(`[DEBUG] Found ${shareholders?.length || 0} shareholders for issuer ${issuerId}`)

  // Get shareholder positions from shareholder_positions_new table
  if (shareholders && shareholders.length > 0) {
    const { data: positions } = await supabase
      .from("shareholder_positions_new")
      .select("shareholder_id, security_id, shares_owned, position_date")
      .eq("issuer_id", issuerId)
      .order("position_date", { ascending: false })

    // Create a map of shareholder_id+security_id -> latest position for that security
    const positionMap = {}
    if (positions) {
      positions.forEach(pos => {
        const key = `${pos.shareholder_id}_${pos.security_id}`
        // Only keep the latest position for each shareholder+security combo (already sorted desc)
        if (!positionMap[key]) {
          positionMap[key] = pos
        }
      })
    }

    // Aggregate positions by shareholder (sum across all securities)
    const shareholderTotals = {}
    const shareholderSecurities = {} // Track which securities each shareholder has
    Object.values(positionMap).forEach(pos => {
      if (!shareholderTotals[pos.shareholder_id]) {
        shareholderTotals[pos.shareholder_id] = 0
        shareholderSecurities[pos.shareholder_id] = []
      }
      shareholderTotals[pos.shareholder_id] += pos.shares_owned || 0
      if (pos.shares_owned > 0) {
        shareholderSecurities[pos.shareholder_id].push(pos.security_id)
      }
    })

    // Calculate total shares from all shareholders
    const totalShares = Object.values(shareholderTotals).reduce((sum, shares) => sum + shares, 0)

    // Add position data to shareholders
    shareholders.forEach(shareholder => {
      const totalSharesOwned = shareholderTotals[shareholder.id] || 0

      if (totalSharesOwned > 0) {
        // We have position data, use it
        shareholder.current_shares = totalSharesOwned
        shareholder.calculated_ownership_percentage = totalShares > 0
          ? ((totalSharesOwned / totalShares) * 100).toFixed(2)
          : "0.00"
        shareholder.security_ids = shareholderSecurities[shareholder.id] || []
      } else {
        // No position data
        shareholder.current_shares = 0
        shareholder.calculated_ownership_percentage = "0.00"
        shareholder.security_ids = []
      }
    })
  }
  
  return shareholders || []
}

export default function ShareholderPage({ params: paramsPromise }) {
  const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, userRoles, loading, initialized, validateAndSetIssuer } = useAuth()
  const router = useRouter()
  const [issuerId, setIssuerId] = useState(null)
  const [securities, setSecurities] = useState([])
  const [selectedSecurityFilter, setSelectedSecurityFilter] = useState("all")

  // ⚡ SWR AGGRESSIVE CACHING
  const fetcher = async ([id, role]) => {
    if (!id) return [];
    return await getShareholders(id, role);
  };

  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: true,
    dedupingInterval: 300000, // 5 min
    refreshInterval: 0,
    shouldRetryOnError: false,
    revalidateIfStale: false,
  };

  const { data: shareholdersData = [], mutate: mutateShareholders, isLoading: swrLoading } = useSWR(
    issuerId && userRole ? [issuerId, userRole] : null,
    fetcher,
    swrConfig
  );

  // ⚡ CRITICAL FIX: Ensure shareholders is always an array
  const shareholdersRaw = Array.isArray(shareholdersData) ? shareholdersData : [];

  // Filter shareholders by selected security
  const shareholders = selectedSecurityFilter === "all"
    ? shareholdersRaw
    : shareholdersRaw.filter(sh => {
        const hasSecurityIds = sh.security_ids && sh.security_ids.length > 0;
        const includesSelected = hasSecurityIds && sh.security_ids.includes(selectedSecurityFilter);

        // Debug logging
        if (sh.security_ids && sh.security_ids.length > 0) {
          console.log('🔍 Shareholder filter check:', {
            shareholder: `${sh.first_name} ${sh.last_name}`,
            security_ids: sh.security_ids,
            selectedSecurityFilter,
            includes: includesSelected
          });
        }

        return includesSelected;
      });

  console.log('🔍 Shareholders data:', {
    shareholdersData,
    isArray: Array.isArray(shareholdersData),
    shareholdersRaw: shareholdersRaw.length,
    shareholdersFiltered: shareholders.length,
    selectedSecurityFilter,
    sampleSecurityIds: shareholdersRaw[0]?.security_ids
  });

  const pageLoading = swrLoading || (issuerId && shareholdersData === undefined);

  // ⚡ FIX: Prevent infinite loop with ref guard
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!initialized || !user) return;

    const loadData = async () => {
      try {
        const params = await paramsPromise;
        const id = params?.issuerId;

        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        setIssuerId(id);

        if (!user) {
          router.push('/login');
          return;
        }

        // Just validate auth - SWR handles data fetching
        const authResult = await validateAndSetIssuer(id);

        if (!authResult.hasAccess) {
          router.push('/?error=no_access');
          return;
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user])

  // Fetch securities for filter dropdown
  useEffect(() => {
    const fetchSecurities = async () => {
      if (!issuerId) return;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("securities_new")
        .select("id, class_name, cusip, issue_name")
        .eq("issuer_id", issuerId)
        .eq("status", "active")
        .order("class_name");

      if (!error && data) {
        setSecurities(data);
      }
    };

    fetchSecurities();
  }, [issuerId])

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
      <Sidebar userRole={userRole} currentIssuerId={issuerId} issuerSpecificRole={issuerSpecificRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={user} 
          userRole={userRole} 
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
          userRoles={userRoles}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-6">

              {pageLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading shareholder data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="card-glass border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Shareholders</p>
                            <p className="text-3xl font-bold text-gray-900">{shareholders.length}</p>
                          </div>

                        </div>
                      </CardContent>
                    </Card>

                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Shareholders</p>
                        <p className="text-3xl font-bold text-gray-900">{shareholders.filter(s => parseFloat(s.calculated_ownership_percentage || s.ownership_percentage || 0) > 0).length}</p>
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Average Ownership</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {shareholders.length > 0 
                            ? (shareholders.reduce((sum, s) => sum + parseFloat(s.calculated_ownership_percentage || s.ownership_percentage || 0), 0) / shareholders.length).toFixed(1) + '%'
                            : '0%'
                          }
                        </p>
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>
              </div>

                  {/* Filter Section */}
                  <Card className="card-glass border-0 mb-6">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Filter className="h-5 w-5 text-gray-600" />
                        <div className="flex-1">
                          <Label htmlFor="security-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                            Filter by Security
                          </Label>
                          <Select
                            value={selectedSecurityFilter}
                            onValueChange={setSelectedSecurityFilter}
                          >
                            <SelectTrigger id="security-filter" className="w-full md:w-80">
                              <SelectValue placeholder="All Securities" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Securities</SelectItem>
                              {securities.map((security) => (
                                <SelectItem key={security.id} value={security.id}>
                                  {security.class_name || security.issue_name} ({security.cusip})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedSecurityFilter !== "all" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSecurityFilter("all")}
                            className="mt-6"
                          >
                            Clear Filter
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shareholders Table */}
                  <Card className="card-glass border-0">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900">Shareholder Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ShareholdersTable shareholders={shareholders} userRole={userRole} issuerId={issuerId} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
