"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import { ArrowLeft } from "lucide-react"
import { toUSDate } from "@/lib/dateUtils"

export default function ShareholderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, userRoles, initialized } = useAuth()
  const [shareholder, setShareholder] = useState(null)
  const [positions, setPositions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  // Helper function to get badge color based on security type
  const getSecurityBadgeColor = (securityName) => {
    if (!securityName) return "bg-muted text-muted-foreground";

    const name = securityName.toLowerCase();

    // Class A/B Ordinary Stock - Blue (primary, stable)
    if (name.includes("class a") || name.includes("class b")) {
      if (name.includes("ordinary")) {
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      }
    }

    // Warrants & Rights - Orange/Amber (derivative, speculative)
    if (name.includes("warrant") || name.includes("right")) {
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    }

    // Preferred Stock - Purple (premium, priority)
    if (name.includes("preferred")) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    }

    // Units - Green (bundled, combined)
    if (name.includes("unit")) {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    }

    // Depository/DTC - Gray (custodial)
    if (name.includes("depository") || name.includes("dtc")) {
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }

    // Default - Blue
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }

  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!initialized || !user) return

    const loadData = async () => {
      try {
        if (hasLoadedRef.current) return
        hasLoadedRef.current = true

        const supabase = createClient()

        // Fetch shareholder with issuer info
        const { data: shareholderData, error: shErr } = await supabase
          .from("shareholders_new")
          .select("*, issuers_new:issuer_id ( issuer_name, display_name, address, telephone )")
          .eq("id", params.id)
          .single()

        if (shErr || !shareholderData) {
          console.error("Error fetching shareholder:", shErr)
          setLoading(false)
          return
        }

        setShareholder(shareholderData)

        // Fetch ALL positions for this issuer first (same as list page)
        const { data: allPositionsData, error: posError } = await supabase
          .from("shareholder_positions_new")
          .select("shareholder_id, security_id, shares_owned, position_date, securities_new!fk_spn_security ( class_name, cusip, issue_name )")
          .eq("issuer_id", params.issuerId)
          .order("position_date", { ascending: false })

        // Filter for this specific shareholder and deduplicate
        const positionMap = new Map()
        if (allPositionsData) {
          allPositionsData.forEach(pos => {
            // Only process positions for this shareholder
            if (pos.shareholder_id === params.id) {
              const key = `${pos.shareholder_id}_${pos.security_id}`
              // Only keep the first occurrence (latest due to sorting)
              if (!positionMap.has(key)) {
                positionMap.set(key, pos)
              }
            }
          })
        }

        // Convert map to array
        const latestPositions = Array.from(positionMap.values())
        setPositions(latestPositions)

        // Fetch transactions
        const { data: transactionsData } = await supabase
          .from("transfers_new")
          .select("*")
          .eq("shareholder_id", params.id)
          .eq("issuer_id", params.issuerId)
          .order("transaction_date", { ascending: false })
          .limit(10)

        setTransactions(transactionsData || [])
        setLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [initialized, user, params.id, params.issuerId])

  if (!initialized) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    )
  }

  // Helper function to get shareholder name
  const getShareholderName = () => {
    if (!shareholder) return ""
    if (!shareholder.first_name || shareholder.first_name.trim() === "") {
      return shareholder.last_name || shareholder.name || "-"
    }
    return `${shareholder.first_name} ${shareholder.last_name || ""}`.trim()
  }

  // Calculate total shares from positions
  const totalShares = positions.reduce((sum, pos) => sum + (pos.shares_owned || 0), 0)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} currentIssuerId={params.issuerId} issuerSpecificRole={issuerSpecificRole} />

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
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => router.push(`/issuer/${params.issuerId}/shareholder`)}
                className="mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shareholders
              </Button>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading shareholder data...</p>
                  </div>
                </div>
              ) : !shareholder ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Shareholder not found</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Header Section */}
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">{getShareholderName()}</h1>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {shareholder.holder_type || "Individual"}
                      </Badge>
                      {shareholder.account_number && (
                        <span className="text-sm text-muted-foreground">
                          Account: {shareholder.account_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                        <p className="text-3xl font-bold text-foreground">{totalShares.toLocaleString()}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Securities</p>
                        <p className="text-3xl font-bold text-foreground mb-3">{positions.length}</p>
                        {positions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {positions.map((position, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityBadgeColor(position.securities_new?.class_name || position.securities_new?.issue_name)}`}
                              >
                                {position.securities_new?.class_name || position.securities_new?.issue_name || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                        <p className="text-3xl font-bold text-foreground">{transactions.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader className="bg-muted/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-foreground">
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <dl className="space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                            <dd className="text-base text-foreground font-medium">{getShareholderName()}</dd>
                          </div>
                          {shareholder.taxpayer_id && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Taxpayer ID</dt>
                              <dd className="text-base text-foreground">{shareholder.taxpayer_id}</dd>
                            </div>
                          )}
                          {shareholder.account_number && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Account Number</dt>
                              <dd className="text-base text-foreground">{shareholder.account_number}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Holder Type</dt>
                            <dd className="text-base text-foreground">{shareholder.holder_type || "-"}</dd>
                          </div>
                          {shareholder.dob && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Date of Birth</dt>
                              <dd className="text-base text-foreground">
                                {toUSDate(shareholder.dob)}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                      <CardHeader className="bg-muted/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-foreground">
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <dl className="space-y-4">
                          {shareholder.email && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">
                                Email
                              </dt>
                              <dd className="text-base text-foreground">{shareholder.email}</dd>
                            </div>
                          )}
                          {shareholder.phone && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">
                                Phone
                              </dt>
                              <dd className="text-base text-foreground">{shareholder.phone}</dd>
                            </div>
                          )}
                          {shareholder.address && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">
                                Address
                              </dt>
                              <dd className="text-base text-foreground">
                                {shareholder.address}
                                {shareholder.city && `, ${shareholder.city}`}
                                {shareholder.state && `, ${shareholder.state}`}
                                {shareholder.zip && ` ${shareholder.zip}`}
                                {shareholder.country && `, ${shareholder.country}`}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </CardContent>
                    </Card>

                    {/* Compliance Information */}
                    {(shareholder.lei || shareholder.tin_status || shareholder.ofac_results) && (
                      <Card>
                        <CardHeader className="bg-muted/50 rounded-t-lg">
                          <CardTitle className="text-xl font-bold text-foreground">
                            Compliance Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <dl className="space-y-4">
                            {shareholder.lei && (
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">LEI</dt>
                                <dd className="text-base text-foreground">{shareholder.lei}</dd>
                              </div>
                            )}
                            {shareholder.tin_status && (
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">TIN Status</dt>
                                <dd className="text-base text-foreground">{shareholder.tin_status}</dd>
                              </div>
                            )}
                            {shareholder.ofac_results && (
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">OFAC Results</dt>
                                <dd className="text-base text-foreground">{shareholder.ofac_results}</dd>
                              </div>
                            )}
                            {shareholder.ofac_date && (
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">OFAC Date</dt>
                                <dd className="text-base text-foreground">
                                  {toUSDate(shareholder.ofac_date)}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    )}

                    {/* Issuer Information */}
                    {shareholder.issuers_new && (
                      <Card>
                        <CardHeader className="bg-muted/50 rounded-t-lg">
                          <CardTitle className="text-xl font-bold text-foreground">
                            Issuer Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <dl className="space-y-4">
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Issuer Name</dt>
                              <dd className="text-base text-foreground font-medium">
                                {shareholder.issuers_new.issuer_name || shareholder.issuers_new.display_name}
                              </dd>
                            </div>
                            {shareholder.issuers_new.telephone && (
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                                <dd className="text-base text-foreground">{shareholder.issuers_new.telephone}</dd>
                              </div>
                            )}
                            {shareholder.issuers_new.address && (
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                                <dd className="text-base text-foreground">{shareholder.issuers_new.address}</dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Positions Section */}
                  {positions.length > 0 && (
                    <Card className="mt-6">
                      <CardHeader className="bg-muted/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-foreground">Holdings</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                                <th className="px-4 py-3 text-left font-medium">Security</th>
                                <th className="px-4 py-3 text-left font-medium">CUSIP</th>
                                <th className="px-4 py-3 text-right font-medium">Shares Owned</th>
                                <th className="px-4 py-3 text-left font-medium">Position Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {positions.map((position, idx) => (
                                <tr key={`${position.security_id}-${idx}`} className="border-b border-border hover:bg-muted/30">
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityBadgeColor(position.securities_new?.class_name || position.securities_new?.issue_name)}`}>
                                      {position.securities_new?.class_name || position.securities_new?.issue_name || "-"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-foreground">{position.securities_new?.cusip || "-"}</td>
                                  <td className="px-4 py-3 text-right font-medium text-foreground">
                                    {(position.shares_owned || 0).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-foreground">
                                    {position.position_date
                                      ? toUSDate(position.position_date)
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Transactions */}
                  {transactions.length > 0 && (
                    <Card className="mt-6">
                      <CardHeader className="bg-muted/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-foreground">Recent Transactions</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                <th className="px-4 py-3 text-left font-medium">Type</th>
                                <th className="px-4 py-3 text-right font-medium">Shares</th>
                                <th className="px-4 py-3 text-left font-medium">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((transaction) => (
                                <tr key={transaction.id} className="border-b border-border hover:bg-muted/30">
                                  <td className="px-4 py-3 text-foreground">
                                    {transaction.transaction_date
                                      ? toUSDate(transaction.transaction_date)
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-foreground">{transaction.transaction_type || "-"}</td>
                                  <td className="px-4 py-3 text-right font-medium text-foreground">
                                    {(transaction.share_quantity || 0).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    {transaction.reference_number || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
