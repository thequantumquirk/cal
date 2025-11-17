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

export default function ShareholderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, userRoles, initialized } = useAuth()
  const [shareholder, setShareholder] = useState(null)
  const [positions, setPositions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false)

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

        console.log('🔍 All Positions for Issuer:', {
          issuerId: params.issuerId,
          allPositions: allPositionsData,
          error: posError,
          count: allPositionsData?.length
        })

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
        console.log('🔍 Filtered Positions for Shareholder:', {
          shareholderId: params.id,
          positions: latestPositions,
          totalShares: latestPositions.reduce((sum, pos) => sum + (pos.shares_owned || 0), 0)
        })

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
    <div className="flex h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
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
                className="mb-6 border-white/20 bg-white/50 hover:bg-white/70"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shareholders
              </Button>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading shareholder data...</p>
                  </div>
                </div>
              ) : !shareholder ? (
                <Card className="card-glass border-0">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-600">Shareholder not found</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Header Section */}
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{getShareholderName()}</h1>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {shareholder.holder_type || "Individual"}
                      </Badge>
                      {shareholder.account_number && (
                        <span className="text-sm text-gray-600">
                          Account: {shareholder.account_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="card-glass border-0">
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-600">Total Shares</p>
                        <p className="text-3xl font-bold text-gray-900">{totalShares.toLocaleString()}</p>
                      </CardContent>
                    </Card>

                    <Card className="card-glass border-0">
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-600">Securities</p>
                        <p className="text-3xl font-bold text-gray-900 mb-3">{positions.length}</p>
                        {positions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {positions.map((position, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {position.securities_new?.class_name || position.securities_new?.issue_name || 'Unknown'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="card-glass border-0">
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                        <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <Card className="card-glass border-0">
                      <CardHeader className="bg-orange-200/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-gray-900">
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <dl className="space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Full Name</dt>
                            <dd className="text-base text-gray-900 font-medium">{getShareholderName()}</dd>
                          </div>
                          {shareholder.taxpayer_id && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Taxpayer ID</dt>
                              <dd className="text-base text-gray-900">{shareholder.taxpayer_id}</dd>
                            </div>
                          )}
                          {shareholder.account_number && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Account Number</dt>
                              <dd className="text-base text-gray-900">{shareholder.account_number}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Holder Type</dt>
                            <dd className="text-base text-gray-900">{shareholder.holder_type || "-"}</dd>
                          </div>
                          {shareholder.dob && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Date of Birth</dt>
                              <dd className="text-base text-gray-900">
                                {new Date(shareholder.dob).toLocaleDateString()}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card className="card-glass border-0">
                      <CardHeader className="bg-orange-200/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-gray-900">
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <dl className="space-y-4">
                          {shareholder.email && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">
                                Email
                              </dt>
                              <dd className="text-base text-gray-900">{shareholder.email}</dd>
                            </div>
                          )}
                          {shareholder.phone && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">
                                Phone
                              </dt>
                              <dd className="text-base text-gray-900">{shareholder.phone}</dd>
                            </div>
                          )}
                          {shareholder.address && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">
                                Address
                              </dt>
                              <dd className="text-base text-gray-900">
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
                      <Card className="card-glass border-0">
                        <CardHeader className="bg-orange-200/50 rounded-t-lg">
                          <CardTitle className="text-xl font-bold text-gray-900">
                            Compliance Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <dl className="space-y-4">
                            {shareholder.lei && (
                              <div>
                                <dt className="text-sm font-medium text-gray-600">LEI</dt>
                                <dd className="text-base text-gray-900">{shareholder.lei}</dd>
                              </div>
                            )}
                            {shareholder.tin_status && (
                              <div>
                                <dt className="text-sm font-medium text-gray-600">TIN Status</dt>
                                <dd className="text-base text-gray-900">{shareholder.tin_status}</dd>
                              </div>
                            )}
                            {shareholder.ofac_results && (
                              <div>
                                <dt className="text-sm font-medium text-gray-600">OFAC Results</dt>
                                <dd className="text-base text-gray-900">{shareholder.ofac_results}</dd>
                              </div>
                            )}
                            {shareholder.ofac_date && (
                              <div>
                                <dt className="text-sm font-medium text-gray-600">OFAC Date</dt>
                                <dd className="text-base text-gray-900">
                                  {new Date(shareholder.ofac_date).toLocaleDateString()}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    )}

                    {/* Issuer Information */}
                    {shareholder.issuers_new && (
                      <Card className="card-glass border-0">
                        <CardHeader className="bg-orange-200/50 rounded-t-lg">
                          <CardTitle className="text-xl font-bold text-gray-900">
                            Issuer Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <dl className="space-y-4">
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Issuer Name</dt>
                              <dd className="text-base text-gray-900 font-medium">
                                {shareholder.issuers_new.issuer_name || shareholder.issuers_new.display_name}
                              </dd>
                            </div>
                            {shareholder.issuers_new.telephone && (
                              <div>
                                <dt className="text-sm font-medium text-gray-600">Phone</dt>
                                <dd className="text-base text-gray-900">{shareholder.issuers_new.telephone}</dd>
                              </div>
                            )}
                            {shareholder.issuers_new.address && (
                              <div>
                                <dt className="text-sm font-medium text-gray-600">Address</dt>
                                <dd className="text-base text-gray-900">{shareholder.issuers_new.address}</dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Positions Section */}
                  {positions.length > 0 && (
                    <Card className="card-glass border-0 mt-6">
                      <CardHeader className="bg-orange-200/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-gray-900">Holdings</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border">
                            <thead>
                              <tr className="bg-orange-50 text-gray-700">
                                <th className="px-4 py-3 text-left">Security</th>
                                <th className="px-4 py-3 text-left">CUSIP</th>
                                <th className="px-4 py-3 text-right">Shares Owned</th>
                                <th className="px-4 py-3 text-left">Position Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {positions.map((position, idx) => (
                                <tr key={`${position.security_id}-${idx}`} className="border-t hover:bg-orange-50/50">
                                  <td className="px-4 py-3">
                                    {position.securities_new?.class_name || position.securities_new?.issue_name || "-"}
                                  </td>
                                  <td className="px-4 py-3">{position.securities_new?.cusip || "-"}</td>
                                  <td className="px-4 py-3 text-right font-medium">
                                    {(position.shares_owned || 0).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3">
                                    {position.position_date
                                      ? new Date(position.position_date).toLocaleDateString()
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
                    <Card className="card-glass border-0 mt-6">
                      <CardHeader className="bg-orange-200/50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-gray-900">Recent Transactions</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border">
                            <thead>
                              <tr className="bg-orange-50 text-gray-700">
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-right">Shares</th>
                                <th className="px-4 py-3 text-left">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((transaction) => (
                                <tr key={transaction.id} className="border-t hover:bg-orange-50/50">
                                  <td className="px-4 py-3">
                                    {transaction.transaction_date
                                      ? new Date(transaction.transaction_date).toLocaleDateString()
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3">{transaction.transaction_type || "-"}</td>
                                  <td className="px-4 py-3 text-right font-medium">
                                    {(transaction.share_quantity || 0).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
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
