"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Download, Calendar, ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ShareholderStatementsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [shareholderData, setShareholderData] = useState(null)
  const [issuers, setIssuers] = useState([])
  const [selectedIssuerId, setSelectedIssuerId] = useState("")
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0])
  const [previewData, setPreviewData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // Fetch user and shareholder data
  useEffect(() => {
    async function fetchUserAndShareholder() {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setUser(user)

      // Fetch shareholder data using the same API as shareholder home
      const response = await fetch(`/api/shareholders?email=${user.email}`)
      const data = await response.json()

      if (!response.ok || !data.profile) {
        console.error("Error fetching shareholder:", data.error)
        return
      }

      setShareholderData(data.profile)

      // Get unique issuers from holdings
      const uniqueIssuers = []
      const issuerMap = new Map()

      data.holdings?.forEach(holding => {
        const issuer = holding.issuer
        if (issuer && !issuerMap.has(issuer.id)) {
          issuerMap.set(issuer.id, {
            id: issuer.id,
            display_name: issuer.issuer_name
          })
          uniqueIssuers.push({
            id: issuer.id,
            display_name: issuer.issuer_name
          })
        }
      })

      setIssuers(uniqueIssuers)
      if (uniqueIssuers.length > 0) {
        setSelectedIssuerId(uniqueIssuers[0].id)
      }

      setIsLoading(false)
    }

    fetchUserAndShareholder()
  }, [router])

  // Helper function to convert date to US format
  const toUSDate = (isoDateString) => {
    if (!isoDateString) return ""
    const date = new Date(isoDateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Preview statement
  const previewStatement = async () => {
    if (!selectedIssuerId || !shareholderData) {
      alert("Please select an issuer")
      return
    }

    setIsGenerating(true)
    const supabase = createClient()

    try {
      // Fetch issuer data
      const { data: issuer } = await supabase
        .from("issuers_new")
        .select("*")
        .eq("id", selectedIssuerId)
        .single()

      // Fetch securities for this issuer
      const { data: securities } = await supabase
        .from("securities_new")
        .select("*")
        .eq("issuer_id", selectedIssuerId)

      // Fetch transfers for this shareholder and issuer
      const { data: transfers } = await supabase
        .from("transfers_new")
        .select("shareholder_id, cusip, transaction_type, share_quantity, restriction_id, transaction_date")
        .eq("issuer_id", selectedIssuerId)
        .eq("shareholder_id", shareholderData.id)
        .lte("transaction_date", statementDate + "T23:59:59")
        .order("transaction_date", { ascending: true })

      // Fetch manual restrictions for this shareholder and issuer
      const { data: manualRestrictions } = await supabase
        .from("transaction_restrictions_new")
        .select("shareholder_id, cusip, restriction_id, restricted_shares, restriction_date")
        .eq("issuer_id", selectedIssuerId)
        .eq("shareholder_id", shareholderData.id)
        .lte("restriction_date", statementDate + "T23:59:59")

      // Get all restriction IDs
      const transactionRestrictionIds = [...new Set(transfers?.filter(t => t.restriction_id).map(t => t.restriction_id) || [])]
      const manualRestrictionIds = [...new Set(manualRestrictions?.map(r => r.restriction_id) || [])]
      const allRestrictionIds = [...new Set([...transactionRestrictionIds, ...manualRestrictionIds])]

      let restrictionsMap = new Map()

      if (allRestrictionIds.length > 0) {
        const { data: restrictionsData } = await supabase
          .from("restrictions_templates_new")
          .select("id, restriction_type, restriction_name, description")
          .in("id", allRestrictionIds)
          .eq("is_active", true)

        restrictionsData?.forEach(r => restrictionsMap.set(r.id, r))
      }

      // Create securities map for O(1) lookup
      const securitiesMap = new Map(securities?.map(s => [s.cusip, s]))

      // Calculate holdings by CUSIP
      const holdingsByCusip = {}

      transfers?.forEach(transfer => {
        const cusip = transfer.cusip
        const security = securitiesMap.get(cusip)

        if (!holdingsByCusip[cusip]) {
          holdingsByCusip[cusip] = {
            cusip,
            security_name: security?.issue_name || "Unknown Security",
            security_type: security?.security_type || "Unknown",
            shares_outstanding: 0,
            restrictions: [],
            restrictedShares: 0
          }
        }

        // Determine if credit or debit
        const isCredit = !(
          transfer.transaction_type === "DWAC Withdrawal" ||
          transfer.transaction_type === "Transfer Debit" ||
          transfer.transaction_type === "Debit" ||
          transfer.transaction_type?.toLowerCase().includes("debit")
        )

        const shareChange = isCredit ? transfer.share_quantity : -transfer.share_quantity
        holdingsByCusip[cusip].shares_outstanding += shareChange

        // Add transaction-based restrictions
        if (transfer.restriction_id) {
          const restriction = restrictionsMap.get(transfer.restriction_id)
          if (restriction && !holdingsByCusip[cusip].restrictions.find(r => r.id === restriction.id)) {
            holdingsByCusip[cusip].restrictions.push(restriction)
          }
          if (isCredit) {
            holdingsByCusip[cusip].restrictedShares += transfer.share_quantity
          }
        }
      })

      // Add manual restrictions
      manualRestrictions?.forEach(manualRestriction => {
        const cusip = manualRestriction.cusip

        if (!holdingsByCusip[cusip]) {
          const security = securitiesMap.get(cusip)
          holdingsByCusip[cusip] = {
            cusip,
            security_name: security?.issue_name || "Unknown Security",
            security_type: security?.security_type || "Unknown",
            shares_outstanding: 0,
            restrictions: [],
            restrictedShares: 0
          }
        }

        const restriction = restrictionsMap.get(manualRestriction.restriction_id)
        if (restriction && !holdingsByCusip[cusip].restrictions.find(r => r.id === restriction.id)) {
          holdingsByCusip[cusip].restrictions.push(restriction)
        }
        holdingsByCusip[cusip].restrictedShares += manualRestriction.restricted_shares || 0
      })

      // Filter out holdings with 0 shares
      const holdings = Object.values(holdingsByCusip).filter(h => h.shares_outstanding > 0)

      // Add restriction name to holdings for display
      holdings.forEach(holding => {
        if (holding.restrictions && holding.restrictions.length > 0) {
          holding.restriction_name = holding.restrictions
            .map(r => r.restriction_name || r.restriction_type)
            .join(", ")
        }
      })

      // Add security info to transactions for display
      const transactionsWithSecurities = transfers?.map(t => ({
        ...t,
        security: securitiesMap.get(t.cusip)
      })) || []

      // Prepare preview data
      const data = {
        shareholder: shareholderData,
        holdings,
        all_transactions: transactionsWithSecurities,
        statement_date: statementDate,
        issuer,
        securities: securities || []
      }

      setPreviewData([data])
    } catch (error) {
      console.error("Error generating statement:", error)
      alert("Error generating statement. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Download statement as PDF
  const downloadStatement = () => {
    if (!previewData) {
      alert("Please preview the statement first")
      return
    }

    try {
      // Get the preview content
      const printContents = document.getElementById("statement-preview").innerHTML

      // Open a new print window
      const newWindow = window.open("", "_blank")
      newWindow.document.write(`
        <html>
          <head>
            <title>Shareholder Statement</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
              }
              table {
                border-collapse: collapse;
                width: 100%;
              }
              table, th, td {
                border: 1px solid #ccc;
              }
              th, td {
                padding: 8px;
                text-align: left;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `)
      newWindow.document.close()
      newWindow.focus()
      newWindow.print()
      newWindow.close()
    } catch (error) {
      console.error("Error printing statement:", error)
      alert("Failed to print statement")
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const selectedIssuer = issuers.find(i => i.id === selectedIssuerId)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/shareholder-home")}
              className="mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Generate Statement</h1>
            <p className="text-muted-foreground mt-2">
              Generate your shareholder statement for a specific issuer and date
            </p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Statement Generation Form */}
        <Card className="border shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Statement Details</span>
            </CardTitle>
            <CardDescription>
              Select an issuer from your holdings and a statement date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Select Issuer</Label>
              <select
                value={selectedIssuerId}
                onChange={(e) => setSelectedIssuerId(e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground"
              >
                {issuers.map((issuer) => (
                  <option key={issuer.id} value={issuer.id}>
                    {issuer.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statementDate" className="text-foreground font-medium">
                Statement Date
              </Label>
              <Input
                id="statementDate"
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="border-input bg-background text-foreground"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={previewStatement}
                disabled={isGenerating || !selectedIssuerId}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
              >
                {isGenerating ? "Generating..." : "Preview Statement"}
              </Button>
              <Button
                onClick={downloadStatement}
                disabled={!previewData}
                className="flex-1 bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
              >
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statement Preview */}
        {previewData && previewData.length > 0 && (
          <div
            id="statement-preview"
            className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl shadow-sm print:shadow-none print:border-0 print:rounded-none"
            style={{ width: "100%" }}
          >
            <div className="p-12 print:p-8" style={{ width: "100%" }}>
              {/* Issuer Header */}
              <div className="text-center mb-12 print:mb-8" style={{ width: "100%" }}>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground uppercase tracking-wide mb-2">
                  {selectedIssuer?.display_name || ""}
                </h1>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-muted-foreground mb-2">
                  Shareholder Statement
                </h2>
                <h3 className="text-base text-gray-600 dark:text-muted-foreground">
                  As of {toUSDate(previewData[0].statement_date)}
                </h3>
              </div>

              {previewData.map((data, idx) => (
                <section key={idx} style={{ width: "100%" }}>
                  {/* Shareholder Info */}
                  <div
                    className="mb-6 p-6 bg-muted/30 dark:bg-white/5 border border-border rounded-xl"
                    style={{
                      pageBreakInside: "avoid",
                      marginBottom: "24px",
                    }}
                  >
                    <div style={{ width: "100%", textAlign: "left" }}>
                      <div
                        className="font-bold text-foreground"
                        style={{
                          fontSize: "20px",
                          marginBottom: "8px",
                        }}
                      >
                        {[data.shareholder.first_name, data.shareholder.last_name]
                          .filter(Boolean)
                          .join(" ")}
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          lineHeight: "1.6",
                        }}
                        className="text-muted-foreground"
                      >
                        <div>
                          <span className="font-semibold text-foreground">Account #:</span>{" "}
                          {data.shareholder.account_number || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">TIN:</span>{" "}
                          {data.shareholder.taxpayer_id || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Email:</span>{" "}
                          {data.shareholder.email || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outstanding Holdings */}
                  <div className="mb-8 print:mb-6" style={{ width: "100%" }}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
                      Outstanding Holdings by Security
                    </h3>
                    <table className="w-full border-collapse border border-gray-300 dark:border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr>
                          <th className="border-r border-gray-300 dark:border-border p-4 text-left font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-sm">
                            CUSIP
                          </th>
                          <th className="border-r border-gray-300 dark:border-border p-4 text-left font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-sm">
                            SECURITY TYPE
                          </th>
                          <th className="border-r border-gray-300 dark:border-border p-4 text-center font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-sm">
                            SECURITIES OUTSTANDING
                          </th>
                          <th className="p-4 text-center font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-sm">
                            RESTRICTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.holdings.length > 0 ? (
                          data.holdings.map((holding) => (
                            <tr key={holding.cusip} className="border-t border-gray-200 dark:border-border">
                              <td className="border-r border-gray-200 dark:border-border p-4 font-mono text-sm font-medium text-gray-900 dark:text-foreground">
                                {holding.cusip}
                              </td>
                              <td className="border-r border-gray-200 dark:border-border p-4">
                                <div className="font-medium text-gray-900 dark:text-foreground mb-1">
                                  {holding.security_name}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-muted-foreground">
                                  {holding.security_type}
                                </div>
                              </td>
                              <td className="border-r border-gray-200 dark:border-border p-4 text-center font-bold text-gray-900 dark:text-foreground text-lg">
                                {holding.shares_outstanding
                                  ? holding.shares_outstanding.toLocaleString()
                                  : "0"}
                              </td>
                              <td className="p-4 text-center text-gray-800 dark:text-foreground">
                                {holding.restriction_name || "None"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t border-gray-200 dark:border-border">
                            <td
                              colSpan={4}
                              className="p-4 text-center text-gray-500 dark:text-muted-foreground italic"
                            >
                              No holdings as of {toUSDate(data.statement_date)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Transaction History */}
                  <div className="mb-8 print:mb-6" style={{ width: "100%" }}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
                      Complete Transaction History
                    </h3>
                    {(() => {
                      const transactionsByCusip = {}
                      data.all_transactions?.forEach((transaction) => {
                        const cusip = transaction.cusip
                        if (!transactionsByCusip[cusip]) {
                          transactionsByCusip[cusip] = []
                        }
                        transactionsByCusip[cusip].push(transaction)
                      })

                      return Object.entries(transactionsByCusip).map(
                        ([cusip, transactions]) => {
                          const security = transactions[0]?.securities
                          let runningBalance = 0

                          return (
                            <div key={cusip} className="mb-8">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-foreground mb-2">
                                {security?.issue_name || "Unknown Security"} - CUSIP: {cusip}
                              </h4>
                              <table className="w-full border-collapse border border-gray-300 dark:border-border rounded-lg overflow-hidden mb-4">
                                <thead>
                                  <tr>
                                    <th className="border-r border-gray-300 dark:border-border p-3 text-left font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-xs">
                                      Transaction Date
                                    </th>
                                    <th className="border-r border-gray-300 dark:border-border p-3 text-left font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-xs">
                                      Transaction Type
                                    </th>
                                    <th className="border-r border-gray-300 dark:border-border p-3 text-center font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-xs">
                                      Credit/Debit
                                    </th>
                                    <th className="border-r border-gray-300 dark:border-border p-3 text-center font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-xs">
                                      Shares
                                    </th>
                                    <th className="p-3 text-center font-semibold bg-gray-50 dark:bg-muted print:bg-white text-gray-700 dark:text-foreground uppercase tracking-wide text-xs">
                                      Securities Outstanding
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transactions.map((transaction, index) => {
                                    const isCredit = !(
                                      transaction.transaction_type === "DWAC Withdrawal" ||
                                      transaction.transaction_type === "Transfer Debit" ||
                                      transaction.transaction_type === "Debit" ||
                                      transaction.transaction_type?.toLowerCase().includes("debit")
                                    )
                                    const shareChange = isCredit
                                      ? transaction.share_quantity
                                      : -transaction.share_quantity
                                    runningBalance += shareChange

                                    return (
                                      <tr
                                        key={index}
                                        className="border-t border-gray-200 dark:border-border"
                                      >
                                        <td className="border-r border-gray-200 dark:border-border p-3 text-gray-900 dark:text-foreground">
                                          {toUSDate(transaction.transaction_date)}
                                        </td>
                                        <td className="border-r border-gray-200 dark:border-border p-3 text-gray-900 dark:text-foreground">
                                          {transaction.transaction_type}
                                        </td>
                                        <td className="border-r border-gray-200 dark:border-border p-3 text-center">
                                          <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${
                                              isCredit
                                                ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-white"
                                                : "bg-red-100 text-red-800 dark:bg-red-600 dark:text-white"
                                            }`}
                                          >
                                            {isCredit ? "Credit" : "Debit"}
                                          </span>
                                        </td>
                                        <td className="border-r border-gray-200 dark:border-border p-3 text-center font-medium text-gray-900 dark:text-foreground">
                                          {transaction.share_quantity.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-center font-bold text-gray-900 dark:text-foreground">
                                          {runningBalance.toLocaleString()}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        }
                      )
                    })()}
                  </div>

                  {/* Restrictions Section */}
                  {(() => {
                    const uniqueRestrictions = new Map()
                    data.holdings.forEach((holding) => {
                      if (holding.restrictions && holding.restrictions.length > 0) {
                        holding.restrictions.forEach((restriction) => {
                          if (!uniqueRestrictions.has(restriction.id)) {
                            uniqueRestrictions.set(restriction.id, restriction)
                          }
                        })
                      }
                    })

                    if (uniqueRestrictions.size === 0) return null

                    return (
                      <div
                        className="mb-10 print:mb-6"
                        style={{ width: "100%", pageBreakInside: "avoid" }}
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-300 dark:border-border pb-2">
                          Restrictions
                        </h3>
                        <div className="space-y-4">
                          {Array.from(uniqueRestrictions.values()).map((restriction) => (
                            <div
                              key={restriction.id}
                              className="p-4 bg-gray-50 dark:bg-muted/30 border border-gray-200 dark:border-border rounded-md"
                            >
                              <div className="font-semibold text-gray-900 dark:text-foreground mb-2">
                                {restriction.restriction_name || restriction.restriction_type}
                              </div>
                              <div className="text-sm text-gray-700 dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {restriction.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Footer */}
                  <div style={{ textAlign: "center", marginBottom: "16px", width: "100%" }}>
                    <p className="text-sm text-gray-700" style={{ marginBottom: "4px" }}>
                      If you have any questions, please do not hesitate to reach out to us at
                      DAAQ@useefficiency.com
                    </p>
                    <img
                      src="/logo.png"
                      alt="Efficiency - Always Act with Urgency"
                      style={{
                        display: "block",
                        marginLeft: "auto",
                        marginRight: "auto",
                        height: "100px",
                        marginTop: "4px",
                        marginBottom: "4px",
                      }}
                    />
                    <p
                      className="text-sm text-gray-600"
                      style={{
                        marginTop: "4px",
                        textAlign: "center",
                        display: "block",
                        marginLeft: "auto",
                        marginRight: "auto",
                      }}
                    >
                      Always Act with Urgency
                    </p>
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
