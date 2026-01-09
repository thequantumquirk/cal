"use client"

import { useState, useMemo, memo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { normalizeText } from "@/lib/utils"
import Header from "@/components/header"
import { Check, FileText } from "lucide-react"
import { useShareholderHomeData } from "@/hooks/use-shareholder-pages"
import { ShareholderProfileSkeleton, ShareholderHoldingsTableSkeleton } from "@/components/skeletons/ShareholderHomeSkeleton"

export default function ShareholderHomePage() {
  const { user, initialized } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  // ⚡ TanStack Query - fetches shareholder data by email with caching
  const { profile, holdings, isLoading, error } = useShareholderHomeData(user?.email)

  // ⚡ Show skeletons immediately while auth initializes + data loads
  // Don't wait for initialized - show UI with skeletons right away
  return (
    <>
      <Header user={user} userRole="shareholder" />
      <div className="max-w-6xl mt-6 mx-auto p-6 bg-card rounded-lg shadow-sm border border-border">
        {/* Search Issuer */}
        <div className="flex items-center gap-2 mb-6">
          <Input
            placeholder="Search Company"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-input focus:ring-primary focus:border-primary"
          />
        </div>

        {/**
         * Statement Generation Card temporarily disabled per request.
         * Keeping the markup commented so it can be restored easily later.
         */}
        {/*
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Generate Statement</h3>
                  <p className="text-sm text-muted-foreground">
                    View and download your shareholder statements for any issuer
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/shareholder-home/statements")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Statement
              </Button>
            </div>
          </CardContent>
        </Card>
        */}

        {/* Shareholder Profile Section */}
        {isLoading ? (
          <ShareholderProfileSkeleton />
        ) : error ? (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive">{error.message || "Failed to load profile"}</p>
            </CardContent>
          </Card>
        ) : profile ? (
          <Card className="mb-8">
            <CardHeader className="bg-primary rounded-t-md">
              <CardTitle className="text-primary-foreground font-semibold">My Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ProfileContent profile={profile} />
            </CardContent>
          </Card>
        ) : null}

        {/* Holdings Table Section */}
        {isLoading ? (
          <ShareholderHoldingsTableSkeleton />
        ) : (
          <Card>
            <CardHeader className="bg-primary rounded-t-md">
              <CardTitle className="text-primary-foreground font-semibold">Holdings</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <HoldingsTable holdings={holdings} searchTerm={searchTerm} router={router} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

/**
 * ⚡⚡ Memoized ProfileContent component - prevents re-renders on unrelated state changes
 */
const ProfileContent = memo(function ProfileContent({ profile }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <div>
        <dt className="font-medium text-muted-foreground">Name</dt>
        <dd className="text-foreground">
          {profile.first_name} {profile.last_name}
        </dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Account Number</dt>
        <dd className="text-foreground">{profile.account_number}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Shareholder Type</dt>
        <dd className="text-foreground">{profile.holder_type}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Address</dt>
        <dd className="text-foreground">{profile.address}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Email</dt>
        <dd className="text-foreground">{profile.email}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Phone Number</dt>
        <dd className="text-foreground">{profile.phone}</dd>
      </div>
    </dl>
  )
})

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

/**
 * ⚡⚡ Memoized HoldingsTable component - only re-renders when holdings or searchTerm change
 */
const HoldingsTable = memo(function HoldingsTable({ holdings, searchTerm, router }) {
  // ⚡ Filter holdings using useMemo to avoid re-filtering on every render
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) =>
      h.issuer?.issuer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [holdings, searchTerm])

  return (
    <table className="w-full border border-border">
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
        {filteredHoldings.length > 0 ? (
          filteredHoldings.map((h) => (
              <tr
                key={h.id}
                className="border-t border-border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => h.issuer?.id && router.push(`/shareholder-issuer/${h.issuer.id}`)}
              >
                <td className="px-3 py-2 text-left">{normalizeText(h.issuer?.issuer_name) || "-"}</td>
                <td className="px-3 py-2 text-center">{h.shares_owned?.toLocaleString() || "-"}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityBadgeColor(h.security?.class_name || h.security?.issue_name)}`}>
                    {h.security?.class_name || h.security?.issue_name || "-"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {h.ownership_percentage !== null ? `${h.ownership_percentage}%` : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  {h.is_restricted ? (
                    <Check className="h-4 w-4 inline-block text-primary" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center font-semibold text-foreground">
                  {h.legend_code || "—"}
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
  )
})
