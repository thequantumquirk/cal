"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Calendar, DollarSign, Settings } from "lucide-react"
import { toast } from "sonner"
import MarketValuesModal from "@/components/market-values-modal"
import ReactSelect, { components } from "react-select"
import { toUSDate } from "@/lib/dateUtils"

// ⚡ OPTIMIZED: Fetcher for SWR with parallel data loading
const fetcher = async (url) => {
  const [endpoint, issuerId] = url.split('|')
  const supabase = createClient()

  if (endpoint === 'statements-data') {
    // ⚡ PARALLEL: Fetch all 3 endpoints at once
    const [shareholdersRes, securitiesRes, marketValuesRes] = await Promise.all([
      supabase.from("shareholders_new").select("*").eq("issuer_id", issuerId),
      supabase.from("securities_new").select("*").eq("issuer_id", issuerId),
      supabase.from("statements_new").select("*").eq("issuer_id", issuerId)
    ])

    if (shareholdersRes.error) throw shareholdersRes.error
    if (securitiesRes.error) throw securitiesRes.error
    if (marketValuesRes.error) throw marketValuesRes.error

    return {
      shareholders: shareholdersRes.data || [],
      securities: securitiesRes.data || [],
      marketValues: marketValuesRes.data || []
    }
  }

  throw new Error('Invalid endpoint')
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

export default function StatementGenerationPage() {
  const { user, userRole, userRoles, currentIssuer, availableIssuers, issuerSpecificRole, loading, initialized, validateAndSetIssuer } = useAuth()
  const router = useRouter()
  const params = useParams()
  const issuerId = params.issuerId

  const [selectedShareholders, setSelectedShareholders] = useState([]) // multi-selection
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0])
  const [previewData, setPreviewData] = useState(null)
  const [marketValuesModalOpen, setMarketValuesModalOpen] = useState(false)

  // ⚡ OPTIMIZED: useRef guard to prevent duplicate execution
  const hasLoadedRef = useRef(false)

  // ⚡ OPTIMIZED: Single effect with ref guard - NO CASCADING EFFECTS
  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!initialized || !issuerId || !user) return

    const validateAccess = async () => {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true

      try {
        if (!user) {
          router.push('/login')
          return
        }

        const { hasAccess } = await validateAndSetIssuer(issuerId)

        if (!hasAccess) {
          router.push('/?error=no_access')
          return
        }
      } catch (error) {
        console.error('Error in auth check:', error)
      }
    }

    validateAccess()
  }, [initialized, issuerId, user])

  // ⚡ OPTIMIZED: SWR fetches and caches all data in ONE parallel call
  // - Deduplicates API calls automatically
  // - Caches for 5 minutes (subsequent visits = 0 API calls)
  // - All 3 database queries happen in parallel
  const { data, mutate, isLoading, error } = useSWR(
    issuerId ? `statements-data|${issuerId}` : null,
    fetcher,
    swrConfig
  )

  // ⚡ OPTIMIZED: Extract data with safe defaults
  const shareholders = data?.shareholders || []
  const securities = data?.securities || []
  const marketValues = data?.marketValues || []

  // Show error toast if fetch fails
  useEffect(() => {
    if (error) {
      toast.error("Failed to load data")
      console.error("Error fetching data:", error)
    }
  }, [error])

  // ⚡ OPTIMIZED: fetchData now just revalidates SWR cache
  const fetchData = async () => {
    await mutate()
  }

  const previewStatement = async () => {
    if (!selectedShareholders || selectedShareholders.length === 0 || !statementDate) {
      toast.error("Please select at least one shareholder and a statement date")
      return
    }

    try {
      const supabase = createClient()

      console.log(`[STATEMENT] ✅ OPTIMIZED: Fetching transfers + manual restrictions for ${selectedShareholders.length} shareholders in parallel`)

      // 🚀 OPTIMIZATION: Fetch ALL transfers AND manual restrictions in parallel
      const [transfersResult, manualRestrictionsResult] = await Promise.all([
        // Fetch transfers
        supabase
          .from("transfers_new")
          .select("shareholder_id, cusip, transaction_type, share_quantity, restriction_id, transaction_date, created_at")
          .eq("issuer_id", issuerId)
          .in("shareholder_id", selectedShareholders)
          .lte("transaction_date", statementDate + "T23:59:59")
          .order("transaction_date", { ascending: true }),

        // Fetch manual restrictions
        supabase
          .from("transaction_restrictions_new")
          .select("shareholder_id, cusip, restriction_id, restricted_shares, restriction_date")
          .eq("issuer_id", issuerId)
          .in("shareholder_id", selectedShareholders)
          .lte("restriction_date", statementDate + "T23:59:59")
      ])

      if (transfersResult.error) throw transfersResult.error
      if (manualRestrictionsResult.error) throw manualRestrictionsResult.error

      const allTransfers = transfersResult.data
      const manualRestrictions = manualRestrictionsResult.data

      // Group transfers by shareholder (in memory - fast!)
      const transfersByShareholderId = new Map()
      allTransfers?.forEach((transfer) => {
        if (!transfersByShareholderId.has(transfer.shareholder_id)) {
          transfersByShareholderId.set(transfer.shareholder_id, [])
        }
        transfersByShareholderId.get(transfer.shareholder_id).push(transfer)
      })

      // Group manual restrictions by shareholder
      const manualRestrictionsByShareholderId = new Map()
      manualRestrictions?.forEach((restriction) => {
        if (!manualRestrictionsByShareholderId.has(restriction.shareholder_id)) {
          manualRestrictionsByShareholderId.set(restriction.shareholder_id, [])
        }
        manualRestrictionsByShareholderId.get(restriction.shareholder_id).push(restriction)
      })

      // 🚀 OPTIMIZATION: Get ALL restriction IDs from BOTH sources and fetch in ONE query
      const transactionRestrictionIds = [...new Set(allTransfers?.filter(t => t.restriction_id).map(t => t.restriction_id) || [])]
      const manualRestrictionIds = [...new Set(manualRestrictions?.map(r => r.restriction_id) || [])]
      const allRestrictionIds = [...new Set([...transactionRestrictionIds, ...manualRestrictionIds])]

      let restrictionsMap = new Map()

      if (allRestrictionIds.length > 0) {
        const { data: restrictionsData, error: restrictionsError } = await supabase
          .from("restrictions_templates_new")
          .select("id, restriction_type, restriction_name, description")
          .in("id", allRestrictionIds)
          .eq("is_active", true)

        if (restrictionsError) throw restrictionsError

        // Build restrictions Map for O(1) lookup
        restrictionsData?.forEach(r => restrictionsMap.set(r.id, r))
      }

      // Convert securities and marketValues arrays to Maps for O(1) lookup
      const securitiesMap = new Map(securities.map(s => [s.cusip, s]))
      const marketValuesMap = new Map()
      marketValues.forEach(mv => {
        if (!marketValuesMap.has(mv.cusip)) marketValuesMap.set(mv.cusip, [])
        marketValuesMap.get(mv.cusip).push(mv)
      })

      const previews = []

      // Process each shareholder using pre-fetched data
      for (const shareholderId of selectedShareholders) {
        const shareholder = shareholders.find(s => s.id === shareholderId)
        if (!shareholder) continue

        const transfers = transfersByShareholderId.get(shareholderId) || []
        const shareholderManualRestrictions = manualRestrictionsByShareholderId.get(shareholderId) || []

        // Calculate holdings
        const holdingsByCusip = {}
        transfers.forEach((transfer) => {
          if (!holdingsByCusip[transfer.cusip]) {
            holdingsByCusip[transfer.cusip] = { shares: 0, restrictionIds: new Set(), transactions: [] }
          }

          const isCredit = !(transfer.transaction_type === 'DWAC Withdrawal' ||
            transfer.transaction_type === 'Transfer Debit' ||
            transfer.transaction_type === 'Debit' ||
            transfer.transaction_type?.toLowerCase().includes('debit'))
          const shareChange = isCredit ? transfer.share_quantity : -transfer.share_quantity
          holdingsByCusip[transfer.cusip].shares += shareChange

          holdingsByCusip[transfer.cusip].transactions.push({
            date: transfer.transaction_date,
            type: transfer.transaction_type,
            shares: shareChange,
            running_total: holdingsByCusip[transfer.cusip].shares
          })

          // Add transaction-based restriction
          if (transfer.restriction_id) {
            holdingsByCusip[transfer.cusip].restrictionIds.add(transfer.restriction_id)
          }
        })

        // Add manual restrictions to holdings
        shareholderManualRestrictions.forEach((manualRestriction) => {
          if (holdingsByCusip[manualRestriction.cusip]) {
            holdingsByCusip[manualRestriction.cusip].restrictionIds.add(manualRestriction.restriction_id)
          }
        })

        // Build holdings array with O(1) lookups
        const holdings = Object.entries(holdingsByCusip)
          .filter(([cusip, data]) => data.shares > 0)
          .map(([cusip, data]) => {
            const security = securitiesMap.get(cusip)
            const mvList = marketValuesMap.get(cusip) || []
            const marketValue = mvList.find(mv => mv.valuation_date <= statementDate)

            // Get ALL restrictions for this position (both transaction-based + manual)
            const restrictionObjects = Array.from(data.restrictionIds)
              .map(id => restrictionsMap.get(id))
              .filter(r => r) // Remove nulls

            // Build combined restriction display
            const restrictionNames = restrictionObjects
              .map(r => r.restriction_name || r.restriction_type)
              .filter(Boolean)
              .join(', ')

            return {
              cusip,
              shares_outstanding: data.shares,
              market_value_per_share: marketValue?.price_per_share || 0,
              market_value_total: (data.shares * (marketValue?.price_per_share || 0)),
              restriction_name: restrictionNames || null,
              restrictions: restrictionObjects, // Store ALL restriction objects
              security_name: security?.issue_name || "",
              security_type: security?.class_name || ""
            }
          })

        // Push shareholder's preview
        previews.push({
          shareholder,
          statement_date: statementDate,
          holdings,
          all_transactions: transfers
        })
      }

      console.log(`[STATEMENT] ✅ Generated ${previews.length} statements with 3 parallel queries (transfers + manual restrictions + templates)!`)
      setPreviewData(previews)
    } catch (error) {
      console.error("Error previewing statement:", error)
      toast.error(`Failed to preview statements: ${error.message || 'Unknown error'}`)
    }
  }


  const downloadStatement = () => {
    if (!previewData) {
      toast.error("Please preview the statement first")
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
      toast.error("Failed to print statement")
    }
  }

  // ⚡ OPTIMIZED: Progressive loading - show UI immediately, only block on auth
  if (!initialized) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar
          userRole={userRole}
          currentIssuerId={issuerId}
          issuerSpecificRole={issuerSpecificRole}
        />

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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading Statement Generation...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Custom Option with checkbox
  const CheckboxOption = (props) => {
    return (
      <components.Option {...props}>
        <input
          type="checkbox"
          checked={props.isSelected}
          onChange={() => null}
          className="mr-2"
        />
        <label>{props.label}</label>
      </components.Option>
    )
  }

  // Custom MenuList with "Select All"
  const MenuList = (props) => {
    const {
      options,
      getValue,
      setValue,
      selectProps: { onSelectAll }
    } = props

    const isAllSelected = getValue().length === options.length

    return (
      <div>
        <div
          className="px-3 py-2 border-b bg-muted/50 cursor-pointer flex items-center"
          onClick={() => {
            if (isAllSelected) {
              setValue([], "deselect-option")
            } else {
              setValue(options, "select-option")
            }
            if (onSelectAll) onSelectAll(!isAllSelected)
          }}
        >
          <input type="checkbox" readOnly checked={isAllSelected} className="mr-2" />
          <span className="font-medium text-foreground">
            {isAllSelected ? "Deselect All" : "Select All"}
          </span>
        </div>
        <components.MenuList {...props}>{props.children}</components.MenuList>
      </div>
    )
  }

  // Custom styles for ReactSelect to support dark mode using CSS variables
  const customStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: 'var(--background)', // oklch color from globals
      borderColor: 'var(--input)',
      color: 'var(--foreground)',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--popover)',
      border: '1px solid var(--border)',
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--accent)' : 'var(--popover)',
      color: state.isFocused ? 'var(--accent-foreground)' : 'var(--popover-foreground)',
      cursor: 'pointer',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--foreground)',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'var(--secondary)',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'var(--secondary-foreground)',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--secondary-foreground)',
      ':hover': {
        backgroundColor: 'var(--destructive)',
        color: 'var(--destructive-foreground)',
      },
    }),
    input: (base) => ({
      ...base,
      color: 'var(--foreground)',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
    }),
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={userRole}
        currentIssuerId={issuerId}
        issuerSpecificRole={issuerSpecificRole}
      />

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
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Statement Generation</h1>
                <p className="text-muted-foreground mt-2">Generate formal statements for shareholders as of specific dates</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Statement Generation Form */}
              <Card className="border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Generate Statement</span>
                  </CardTitle>
                  <CardDescription>
                    Select a shareholder and date to generate a formal statement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-foreground font-medium">Shareholders</Label>
                        <ReactSelect
                          isMulti
                          closeMenuOnSelect={false}
                          hideSelectedOptions={false}
                          styles={customStyles}
                          options={shareholders.map((s) => ({
                            value: s.id,
                            label: `${[s.first_name, s.last_name]
                              .filter(Boolean)
                              .join(" ")} (${s.account_number || ""})`
                          }))}
                          value={shareholders
                            .filter((s) => selectedShareholders.includes(s.id))
                            .map((s) => ({
                              value: s.id,
                              label: `${[s.first_name, s.last_name]
                                .filter(Boolean)
                                .join(" ")} (${s.account_number || ""})`
                            }))
                          }
                          onChange={(selected) =>
                            setSelectedShareholders(selected.map((opt) => opt.value))
                          }
                          components={{ Option: CheckboxOption, MenuList }}
                          className="basic-multi-select"
                          classNamePrefix="select"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="statementDate" className="text-foreground font-medium">Statement Date</Label>
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
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                        >
                          Preview Statement
                        </Button>
                        <Button
                          onClick={downloadStatement}
                          disabled={!previewData}
                          className="flex-1 bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Statement
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Market Values Management */}
              <Card className="border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span>Market Values</span>
                    </div>
                    {issuerSpecificRole === "admin" && (
                      <Button
                        size="sm"
                        onClick={() => setMarketValuesModalOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-md"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Current market values for securities (used in statement calculations)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {securities.length > 0 ? (
                      securities.map((security) => {
                        const latestMarketValue = marketValues
                          .filter(mv => mv.cusip === security.cusip)
                          .sort((a, b) => new Date(b.valuation_date) - new Date(a.valuation_date))[0]

                        return (
                          <div key={security.cusip} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium text-foreground">{security.issue_name}</p>
                              <p className="text-sm text-muted-foreground">CUSIP: {security.cusip}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-primary">
                                ${latestMarketValue?.price_per_share?.toFixed(2) || "0.00"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {latestMarketValue?.valuation_date || "No price set"}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No securities found for this issuer
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statement Preview */}
            {/* Statement Preview */}
            {previewData && previewData.length > 0 && (
              <div
                id="statement-preview"
                className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl shadow-sm print:shadow-none print:border-0 print:rounded-none"
                style={{ width: "100%" }}
              >
                <div className="p-12 print:p-8" style={{ width: "100%" }}>
                  {/* Issuer Header (only once, top of all statements) */}
                  <div className="text-center mb-12 print:mb-8" style={{ width: "100%" }}>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground uppercase tracking-wide mb-2">
                      {currentIssuer?.issuer_name?.replace(/_/g, " ") ||
                        currentIssuer?.issuer_name ||
                        ""}
                    </h1>
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-muted-foreground mb-2">
                      Shareholder Statements
                    </h2>
                    <h3 className="text-base text-gray-600 dark:text-muted-foreground">
                      As of {toUSDate(previewData[0].statement_date)}
                    </h3>
                  </div>

                  {/* Loop through shareholders */}
                  {previewData.map((data, idx) => (
                    <section
                      key={idx}
                      className="statement-preview mb-12 print:mb-8 border-t border-gray-200 dark:border-border pt-10"
                      style={{ pageBreakAfter: "always", width: "100%" }}
                    >
                      {/* Shareholder Info - Prominent */}
                      <div
                        className="mb-6 p-6 bg-muted/30 dark:bg-white/5 border border-border rounded-xl"
                        style={{
                          pageBreakInside: "avoid", // prevents breaking in PDF
                          marginBottom: "24px",
                        }}
                      >
                        <div
                          className="print:block"
                          style={{
                            width: "100%",
                            textAlign: "left",
                          }}
                        >
                          {/* Shareholder Name */}
                          <div
                            className="font-bold text-foreground"
                            style={{
                              fontSize: "20px", // force bigger for PDF
                              marginBottom: "8px",
                            }}
                          >
                            {[data.shareholder.first_name, data.shareholder.last_name]
                              .filter(Boolean)
                              .join(" ")}
                          </div>

                          {/* Details stacked vertically for PDF */}
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
                                    {holding.restriction_name
                                      ? holding.restriction_name
                                      : "None"}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr className="border-t border-gray-200 dark:border-border">
                                <td
                                  colSpan={4}
                                  className="p-4 text-center text-gray-500 dark:text-muted-foreground italic"
                                >
                                  No holdings as of{" "}
                                  {toUSDate(data.statement_date)}
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
                              const security = securities.find((s) => s.cusip === cusip)
                              let runningBalance = 0

                              return (
                                <div key={cusip} className="mb-8">
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-foreground mb-2">
                                    {security?.issue_name || "Unknown Security"} - CUSIP:{" "}
                                    {cusip}
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
                                          Securities outstanding
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
                                                className={`px-2 py-1 rounded text-xs font-medium ${isCredit
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
                    </section>
                  ))}

                  {/* Restrictions Section (once at the end) */}
                  {(() => {
                    // Collect all unique restrictions from all shareholders (both transaction-based + manual)
                    const uniqueRestrictions = new Map()
                    previewData.forEach(data => {
                      data.holdings.forEach(holding => {
                        // Handle multiple restrictions per holding
                        if (holding.restrictions && holding.restrictions.length > 0) {
                          holding.restrictions.forEach(restriction => {
                            if (!uniqueRestrictions.has(restriction.id)) {
                              uniqueRestrictions.set(restriction.id, restriction)
                            }
                          })
                        }
                      })
                    })

                    // Only show section if there are restrictions
                    if (uniqueRestrictions.size === 0) return null

                    return (
                      <div className="mb-10 print:mb-6" style={{ width: "100%", pageBreakInside: "avoid" }}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-300 dark:border-border pb-2">
                          Restrictions
                        </h3>
                        <div className="space-y-4">
                          {Array.from(uniqueRestrictions.values()).map((restriction, idx) => (
                            <div key={restriction.id} className="p-4 bg-gray-50 dark:bg-muted/30 border border-gray-200 dark:border-border rounded-md">
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

                  {/* Footer (only once, perfectly centered for PDF) */}
                  <div style={{ textAlign: "center", marginBottom: "16px", width: "100%" }}>
                    <p className="text-sm text-gray-700" style={{ marginBottom: "4px" }}>
                      If you have any questions, please do not hesitate to reach out to us
                      at DAAQ@useefficiency.com
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
                </div>
              </div>
            )}



          </div>
        </main>
      </div>

      {/* Market Values Modal */}
      <MarketValuesModal
        isOpen={marketValuesModalOpen}
        onClose={() => setMarketValuesModalOpen(false)}
        issuerId={issuerId}
        securities={securities}
        onUpdate={fetchData}
      />
    </div>
  )
}
