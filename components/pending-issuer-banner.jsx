"use client"

import { useState } from "react"
import useSWR from "swr"
import { Clock, ChevronDown, ChevronUp, CheckCircle2, XCircle, ArrowRight, Building, Users, FileText, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ISSUER_REQUIRED_FIELDS, getIssuerMissingFields } from "@/lib/issuer-status"
import { useRouter } from "next/navigation"

const fetcher = (url) => fetch(url).then(res => res.json())

const CHECKLIST_CATEGORIES = {
  basic: {
    label: 'Issuer Information',
    icon: Building,
    description: 'Name, address, contact details, tax ID'
  },
  regulatory: {
    label: 'Regulatory Details',
    icon: Shield,
    description: 'Ticker symbol, exchange platform'
  },
  separation: {
    label: 'Separation/Split Info',
    icon: FileText,
    description: 'Unit separation ratio'
  }
}

// Additional items to check beyond basic fields
const ADDITIONAL_CHECKS = [
  {
    id: 'shareholders',
    label: 'Shareholders Loaded',
    category: 'data',
    icon: Users,
    check: (counts) => counts?.shareholders > 0,
    description: 'At least one shareholder record'
  },
  {
    id: 'securities',
    label: 'Securities Defined',
    category: 'data',
    icon: FileText,
    check: (counts) => counts?.securities > 0,
    description: 'At least one security type'
  },
  {
    id: 'restrictions',
    label: 'Restrictions Configured',
    category: 'data',
    icon: Shield,
    check: (counts) => counts?.restrictions > 0,
    description: 'Restriction legends set up'
  }
]

export default function PendingIssuerBanner({ issuerId }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()

  // Fetch full issuer data
  const { data: issuer } = useSWR(
    issuerId ? `/api/issuers/${issuerId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Fetch counts for shareholders, securities, and restrictions
  const { data: shareholderData } = useSWR(
    issuerId ? `/api/shareholders?issuerId=${issuerId}&countOnly=true` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: securitiesData } = useSWR(
    issuerId ? `/api/securities?issuerId=${issuerId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: restrictionsData } = useSWR(
    issuerId ? `/api/restrictions?issuerId=${issuerId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const counts = {
    shareholders: shareholderData?.count || shareholderData?.length || 0,
    securities: Array.isArray(securitiesData) ? securitiesData.length : 0,
    restrictions: Array.isArray(restrictionsData) ? restrictionsData.length : 0
  }

  const missingFields = getIssuerMissingFields(issuer)
  const totalRequiredFields = Object.keys(ISSUER_REQUIRED_FIELDS).length
  const completedFields = totalRequiredFields - missingFields.length

  // Check additional items
  const additionalChecks = ADDITIONAL_CHECKS.map(check => ({
    ...check,
    completed: check.check(counts)
  }))
  const completedAdditional = additionalChecks.filter(c => c.completed).length

  // Overall progress
  const totalItems = totalRequiredFields + ADDITIONAL_CHECKS.length
  const completedItems = completedFields + completedAdditional
  const progressPercent = Math.round((completedItems / totalItems) * 100)

  // Group missing fields by category
  const missingByCategory = missingFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = []
    acc[field.category].push(field)
    return acc
  }, {})

  const navigateToSettings = () => {
    router.push(`/issuer/${issuerId}/settings`)
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30">
      {/* Main banner row */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Onboarding Mode
            </span>
          </div>
          <span className="text-sm text-amber-600/80 dark:text-amber-400/80 hidden sm:inline">
            Transactions disabled until issuer goes live
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0 h-5 font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
          >
            {progressPercent}% Complete
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
            onClick={navigateToSettings}
          >
            <span className="hidden sm:inline mr-1">Complete Setup</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded checklist */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-amber-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Required Fields by Category */}
            {Object.entries(CHECKLIST_CATEGORIES).map(([categoryKey, category]) => {
              const CategoryIcon = category.icon
              const categoryFields = Object.entries(ISSUER_REQUIRED_FIELDS)
                .filter(([_, info]) => info.category === categoryKey)
              const missingInCategory = missingByCategory[categoryKey] || []
              const completedInCategory = categoryFields.length - missingInCategory.length
              const isComplete = missingInCategory.length === 0

              return (
                <div
                  key={categoryKey}
                  className={cn(
                    "rounded-lg p-3 border transition-all",
                    isComplete
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/50 dark:bg-black/20 border-amber-500/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryIcon className={cn(
                      "h-4 w-4",
                      isComplete ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    )} />
                    <span className={cn(
                      "text-xs font-semibold",
                      isComplete ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {category.label}
                    </span>
                    {isComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 ml-auto" />
                    ) : (
                      <span className="text-[10px] text-amber-600/70 ml-auto">
                        {completedInCategory}/{categoryFields.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {categoryFields.map(([field, info]) => {
                      const isMissing = missingInCategory.some(m => m.field === field)
                      return (
                        <div key={field} className="flex items-center gap-1.5 text-[11px]">
                          {isMissing ? (
                            <XCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                          )}
                          <span className={cn(
                            isMissing ? "text-amber-600/80 dark:text-amber-400/80" : "text-green-600/80 dark:text-green-400/80"
                          )}>
                            {info.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Data Checks */}
            <div
              className={cn(
                "rounded-lg p-3 border transition-all",
                completedAdditional === ADDITIONAL_CHECKS.length
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/50 dark:bg-black/20 border-amber-500/20"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className={cn(
                  "h-4 w-4",
                  completedAdditional === ADDITIONAL_CHECKS.length
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                )} />
                <span className={cn(
                  "text-xs font-semibold",
                  completedAdditional === ADDITIONAL_CHECKS.length
                    ? "text-green-700 dark:text-green-400"
                    : "text-amber-700 dark:text-amber-300"
                )}>
                  Data Setup
                </span>
                {completedAdditional === ADDITIONAL_CHECKS.length ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 ml-auto" />
                ) : (
                  <span className="text-[10px] text-amber-600/70 ml-auto">
                    {completedAdditional}/{ADDITIONAL_CHECKS.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {additionalChecks.map((check) => {
                  const CheckIcon = check.icon
                  return (
                    <div key={check.id} className="flex items-center gap-1.5 text-[11px]">
                      {check.completed ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                      <span className={cn(
                        check.completed
                          ? "text-green-600/80 dark:text-green-400/80"
                          : "text-amber-600/80 dark:text-amber-400/80"
                      )}>
                        {check.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <div className="flex items-center justify-between text-[11px] text-amber-600/80 dark:text-amber-400/80 mb-1.5">
              <span>Go-Live Readiness</span>
              <span>{completedItems} of {totalItems} items complete</span>
            </div>
            <div className="h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progressPercent === 100 ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
