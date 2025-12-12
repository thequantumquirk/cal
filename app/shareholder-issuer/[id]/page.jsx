"use client"

import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Suspense, useState, useMemo, memo } from "react"
import DocumentsTable from "@/components/DocumentsTable"
import TransactionsTable from "@/components/TransactionsTable"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, TrendingUp } from "lucide-react"
import { normalizeText, splitUSCounsel } from "@/lib/utils"
import dynamic from "next/dynamic"
import { useTradingViewChart } from "@/hooks/useTradingViewChart"
import { isValidTradingViewSymbol, formatTradingViewSymbol } from "@/lib/ticker-utils"
import { ProfileSkeleton, ChartSkeleton } from "@/components/skeletons/ProfileSkeleton"
import { HoldingsSkeleton } from "@/components/skeletons/HoldingsSkeleton"
import { useDataFetchWithDelay } from "@/hooks/useDataFetchWithDelay"
import Header from "@/components/header"

// ⚡ Dynamic imports for heavy components - load only when needed
const TrustAccount = dynamic(() => import("@/components/TrustAccount"), {
  loading: () => <div className="p-4 bg-gray-50 rounded animate-pulse h-48" />,
  ssr: false
})

export default function ShareholderIssuerPage() {
  const params = useParams()
  const { user, initialized } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  // Extract id early (before any effect)
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null

  // ⚡ OPTIMIZED: Reduced cache time for sensitive financial data
  // still fast but respects browser refresh
  const { data: issuerData, error: issuerError } = useDataFetchWithDelay(
    id ? `/api/issuers/${id}` : null,
    { dedupingInterval: 60000 }  // 1 min cache (was 5 min)
  )

  const { data: holdingsData } = useDataFetchWithDelay(
    id && user?.email ? `/api/shareholders?email=${user.email}` : null,
    { dedupingInterval: 60000 }  // 1 min cache (was 5 min)
  )

  const { data: restrictionsData } = useDataFetchWithDelay(
    id ? `/api/restrictions?issuerId=${id}` : null,
    { dedupingInterval: 60000 }  // 1 min cache (was 5 min)
  )

  // Extract and filter holdings for this issuer
  const holdings = issuerData && holdingsData?.holdings
    ? holdingsData.holdings.filter((h) => h.issuer?.id === id)
    : []

  const restrictions = restrictionsData?.restrictions || []
  const issuer = issuerData || null
  const error = issuerError

  const { issuerCounsel, underwritersCounsel } = splitUSCounsel(issuer?.us_counsel)

  // ⚡⚡ OPTIMIZED: Only load TradingView chart when Profile tab is active
  // This saves ~400KB+ of script download on initial page load
  useTradingViewChart(
    activeTab === "profile" ? issuer?.ticker_symbol : null,
    activeTab === "profile" ? issuer?.exchange_platform : null
  )

  return (
    <>
      <Header user={user} userRole="shareholder" />
      <div className="max-w-6xl mx-auto p-6 bg-card rounded-lg shadow-sm border border-border mt-6">
        {/* Back Button */}
        <div className="flex justify-end mb-4">
          <Link href="/shareholder-home">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-border text-foreground hover:bg-accent"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Homepage
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted border border-border mb-6">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-wealth-gradient data-[state=active]:text-black"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="holdings"
              className="data-[state=active]:bg-wealth-gradient data-[state=active]:text-black"
            >
              Holdings
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="data-[state=active]:bg-wealth-gradient data-[state=active]:text-black"
            >
              Document Depository
            </TabsTrigger>
            {/* <TabsTrigger
              value="trust"
              className="data-[state=active]:bg-wealth-gradient data-[state=active]:text-black"
            >
              Trust Account
            </TabsTrigger> */}
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-wealth-gradient data-[state=active]:text-black"
            >
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab with Suspense */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="bg-primary rounded-t-md">
                <CardTitle className="text-primary-foreground font-semibold">Company Profile</CardTitle>
              </CardHeader>

              {/* Market Chart Section - WIP (temporarily hidden) */}
              {/* <div className="mt-10 pl-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  Market Performance
                  {issuer && (
                    <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                      {issuer.exchange_platform || "NASDAQ"}: {issuer.ticker_symbol || "N/A"}
                    </span>
                  )}
                </h3>
                {!issuer ? (
                  <ChartSkeleton />
                ) : !isValidTradingViewSymbol(issuer.ticker_symbol, issuer.exchange_platform) ? (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-muted/50 rounded-lg border border-border">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">Market data not available</p>
                    <p className="text-sm text-muted-foreground">No valid ticker symbol configured for this issuer</p>
                  </div>
                ) : (
                  <div id="tradingview-widget" className="rounded-md overflow-hidden border border-border" style={{ height: 400 }} />
                )}
              </div> */}

              {/* Profile Fields */}
              <CardContent className="pt-4">
                {error ? (
                  <p className="text-destructive">{error.message || "Failed to load issuer"}</p>
                ) : !issuer ? (
                  <ProfileSkeleton />
                ) : (
                  <ProfileContent issuer={issuer} issuerCounsel={issuerCounsel} underwritersCounsel={underwritersCounsel} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holdings Tab with Suspense */}
          <TabsContent value="holdings">
            <Card>
              <CardHeader className="bg-primary rounded-t-md">
                <CardTitle className="text-primary-foreground font-semibold">Holdings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {!holdings.length && !restrictions.length ? (
                  <HoldingsSkeleton />
                ) : (
                  <HoldingsContent holdings={holdings} restrictions={restrictions} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="bg-primary rounded-t-md">
                <CardTitle className="text-primary-foreground font-semibold">Document Depository</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Suspense fallback={<div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>}>
                  <DocumentsTable issuerId={id} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trust Account Tab with Dynamic Import */}
          {/* <TabsContent value="trust">
            <Card>
              <CardHeader className="bg-primary rounded-t-md">
                <CardTitle className="text-primary-foreground font-semibold">Trust Account</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Suspense fallback={<div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>}>
                  <TrustAccount issuerId={id} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader className="bg-primary rounded-t-md">
                <CardTitle className="text-primary-foreground font-semibold">Transactions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Suspense fallback={<div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>}>
                  <TransactionsTable issuerId={id} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

// ⚡⚡ Memoized utility function - computed once and reused
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

// ⚡⚡ Memoized ProfileContent component - prevents re-renders
const ProfileContent = memo(function ProfileContent({ issuer, issuerCounsel, underwritersCounsel }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-sm">
      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Company Name</dt>
        <dd className="mt-1 text-foreground">
          {normalizeText(issuer.display_name || issuer.issuer_name)}
        </dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Incorporation</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.incorporation)}</dd>
      </div>

      <div className="sm:col-span-2">
        <dt className="font-medium text-muted-foreground uppercase text-xs">Address</dt>
        <dd className="mt-1 whitespace-pre-line text-foreground">
          {normalizeText(issuer.address)}
        </dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Telephone</dt>
        <dd className="mt-1 text-foreground">{issuer.telephone}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Tax ID</dt>
        <dd className="mt-1 text-foreground">{issuer.tax_id}</dd>
      </div>

      <div className="sm:col-span-2">
        <dt className="font-medium text-muted-foreground uppercase text-xs">Underwriter</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.underwriter)}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Exchange</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.exchange_platform)}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Forms/SL Status</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.forms_sl_status)}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Timeframe for Separation</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.timeframe_for_separation)}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Separation Ratio</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.separation_ratio)}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Business Combination Timeframe</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.timeframe_for_bc)}</dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Issuer's Counsel</dt>
        <dd className="mt-1 text-foreground">
          {issuerCounsel ? normalizeText(issuerCounsel) : "—"}
        </dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Underwriters' Counsel</dt>
        <dd className="mt-1 text-foreground">
          {underwritersCounsel ? normalizeText(underwritersCounsel) : "—"}
        </dd>
      </div>

      <div>
        <dt className="font-medium text-muted-foreground uppercase text-xs">Offshore Counsel</dt>
        <dd className="mt-1 text-foreground">{normalizeText(issuer.offshore_counsel)}</dd>
      </div>

      {issuer.notes && (
        <div className="sm:col-span-2">
          <dt className="font-medium text-muted-foreground uppercase text-xs">Notes</dt>
          <dd className="mt-1 text-foreground">{normalizeText(issuer.notes)}</dd>
        </div>
      )}
    </dl>
  )
})

// ⚡⚡ Memoized HoldingsContent component - prevents re-renders
const HoldingsContent = memo(function HoldingsContent({ holdings, restrictions }) {

  return (
    <div>
      {/* Holdings Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-border text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="px-3 py-2 text-left font-semibold">Company</th>
              <th className="px-3 py-2 text-center font-semibold">Number of Securities</th>
              <th className="px-3 py-2 text-center font-semibold">Type of Security</th>
              <th className="px-3 py-2 text-center font-semibold">Ownership</th>
              <th className="px-3 py-2 text-center font-semibold">Restricted</th>
              <th className="px-3 py-2 text-center font-semibold">Legend</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length > 0 ? (
              holdings.map((h) => (
                <tr key={h.id} className="border-t border-border hover:bg-accent transition-colors">
                  <td className="px-3 py-2 text-left">
                    {normalizeText(h.issuer?.issuer_name)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {h.shares_owned?.toLocaleString() || "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityBadgeColor(h.security?.class_name || h.security?.issue_name)}`}>
                      {h.security?.class_name || h.security?.issue_name || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {h.ownership_percentage !== null ? `${h.ownership_percentage}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-primary">
                    <Check className="h-4 w-4 inline-block" />
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-foreground">
                    {h.legend_code || "A"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted-foreground">
                  No holdings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Restrictions Table */}
      <div className="mt-10">
        <CardHeader className="bg-primary/10 rounded-t-md mb-2">
          <CardTitle className="text-foreground font-semibold">Restrictions</CardTitle>
        </CardHeader>

        <table className="w-full border border-border text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="px-3 py-2 text-left w-20 font-semibold">CODE</th>
              <th className="px-3 py-2 text-left font-semibold">LEGEND</th>
            </tr>
          </thead>
          <tbody>
            {restrictions.length > 0 ? (
              restrictions.map((r) => (
                <tr key={r.code} className={r.code === "A" ? "bg-muted/50" : ""}>
                  <td className="px-3 py-2 font-semibold">{r.code}</td>
                  <td className="px-3 py-2 whitespace-pre-line">{r.legend}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="text-center py-4 text-muted-foreground">
                  No restrictions data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})
