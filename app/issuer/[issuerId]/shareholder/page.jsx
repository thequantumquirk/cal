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
import { Users, Search, Filter, Download, Plus, BarChart3, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

        // NEW: Add per-security share counts
        shareholder.position_shares = {}
        Object.values(positionMap).forEach(pos => {
          if (pos.shareholder_id === shareholder.id) {
            shareholder.position_shares[pos.security_id] = pos.shares_owned || 0
          }
        })
      } else {
        // No position data
        shareholder.current_shares = 0
        shareholder.calculated_ownership_percentage = "0.00"
        shareholder.security_ids = []
        shareholder.position_shares = {}
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
  const [selectedSecurities, setSelectedSecurities] = useState([])

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

  // Filter shareholders by selected securities (multi-select)
  const shareholders = selectedSecurities.length === 0
    ? shareholdersRaw
    : shareholdersRaw.filter(sh => {
        const hasSecurityIds = sh.security_ids && sh.security_ids.length > 0;
        // Check if shareholder has ANY of the selected securities
        const includesSelected = hasSecurityIds && sh.security_ids.some(secId =>
          selectedSecurities.includes(secId)
        );

        // Debug logging
        if (sh.security_ids && sh.security_ids.length > 0) {
          console.log('🔍 Shareholder filter check:', {
            shareholder: `${sh.first_name} ${sh.last_name}`,
            security_ids: sh.security_ids,
            selectedSecurities,
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
    selectedSecurities,
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

  return (
    <div className="flex h-screen bg-background">
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading shareholder data...</p>
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
                            <p className="text-sm font-medium text-muted-foreground">Total Shareholders</p>
                            <p className="text-3xl font-bold text-foreground">{shareholders.length}</p>
                          </div>

                        </div>
                      </CardContent>
                    </Card>

                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Shareholders</p>
                        <p className="text-3xl font-bold text-foreground">{shareholders.filter(s => parseFloat(s.calculated_ownership_percentage || s.ownership_percentage || 0) > 0).length}</p>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Average Ownership</p>
                        <p className="text-3xl font-bold text-foreground">
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
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Filter className="h-5 w-5 text-muted-foreground" />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 border-dashed border-primary text-primary hover:bg-primary/10 dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                                >
                                  Filter by Securities
                                  {selectedSecurities.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
                                      {selectedSecurities.length}
                                    </Badge>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <div className="max-h-64 overflow-auto">
                                  {securities.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                      No securities available
                                    </div>
                                  ) : (
                                    <div className="p-2">
                                      {securities.map((security) => {
                                        const isSelected = selectedSecurities.includes(security.id);
                                        return (
                                          <div
                                            key={security.id}
                                            className="flex items-center space-x-2 rounded-sm px-2 py-2 hover:bg-muted"
                                          >
                                            <Checkbox
                                              id={`security-${security.id}`}
                                              checked={isSelected}
                                              onCheckedChange={(checked) => {
                                                setSelectedSecurities(prev => {
                                                  if (checked) {
                                                    // Only add if not already present
                                                    return prev.includes(security.id) ? prev : [...prev, security.id];
                                                  } else {
                                                    return prev.filter(id => id !== security.id);
                                                  }
                                                });
                                              }}
                                            />
                                            <label
                                              htmlFor={`security-${security.id}`}
                                              className="flex-1 text-sm cursor-pointer"
                                            >
                                              {security.class_name || security.issue_name}
                                              <span className="text-muted-foreground ml-1">({security.cusip})</span>
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {selectedSecurities.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSecurities([])}
                              className="text-xs border-primary text-primary hover:bg-primary/10 dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>

                        {selectedSecurities.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedSecurities.map(secId => {
                              const security = securities.find(s => s.id === secId);
                              if (!security) return null;
                              return (
                                <Badge
                                  key={secId}
                                  variant="secondary"
                                  className="h-8 px-3 gap-1"
                                >
                                  <span className="text-xs">
                                    {security.class_name || security.issue_name}
                                  </span>
                                  <button
                                    onClick={() => setSelectedSecurities(prev => prev.filter(id => id !== secId))}
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        {selectedSecurities.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Showing shareholders with any of the selected securities
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shareholders Table */}
                  <Card className="card-glass border-0">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-foreground">Shareholder Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ShareholdersTable shareholders={shareholders} userRole={userRole} issuerId={issuerId} securities={securities} />
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
