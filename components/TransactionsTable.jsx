'use client'

import { memo, useMemo } from 'react'
import { useDataFetchWithDelay } from '@/hooks/useDataFetchWithDelay'
import { TransactionsTableSkeleton } from '@/components/skeletons/TablesSkeleton'
import { toUSDate } from "@/lib/dateUtils";

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

// Helper function to get badge color based on transaction type
const getTransactionTypeBadgeColor = (transactionType) => {
  if (!transactionType) return "bg-muted text-muted-foreground";

  const type = transactionType.toLowerCase();

  // Credits/Deposits - Green (positive)
  if (type.includes("credit") || type.includes("deposit") || type.includes("issuance") || type.includes("ipo")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }

  // Debits/Withdrawals - Red (negative)
  if (type.includes("debit") || type.includes("withdrawal") || type.includes("redemption")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }

  // Transfers - Blue (movement)
  if (type.includes("transfer")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }

  // DWAC - Purple (electronic)
  if (type.includes("dwac")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }

  // Conversion/Split - Amber (transformation)
  if (type.includes("conversion") || type.includes("split") || type.includes("merger")) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  // Default - Gray
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

function TransactionsTable({ issuerId }) {
  return <TransactionsTableContent issuerId={issuerId} />
}

const TransactionsTableContent = memo(function TransactionsTableContent({ issuerId }) {
  // ⚡ Fetch transactions
  const { data, isLoading, error } = useDataFetchWithDelay(
    issuerId ? `/api/issuers/${issuerId}/transactions` : null
  )

  // ⚡ Fetch securities to map CUSIP → security name
  const { data: securitiesData } = useDataFetchWithDelay(
    issuerId ? `/api/securities?issuerId=${issuerId}` : null
  )

  // Build CUSIP → security name map
  const securitiesMap = useMemo(() => {
    const map = {}
    if (securitiesData && Array.isArray(securitiesData)) {
      securitiesData.forEach(s => {
        map[s.cusip] = s.class_name || s.issue_name || s.cusip
      })
    }
    return map
  }, [securitiesData])

  const txs = data?.transactions || []

  if (isLoading) return <TransactionsTableSkeleton />
  if (error) return <p className="text-destructive">{error.message || "Failed to load transactions"}</p>

  return (
    <table className="w-full border border-border">
      <thead>
        <tr className="bg-primary text-primary-foreground">
          <th className="px-3 py-2 text-left font-semibold">Date</th>
          <th className="px-3 py-2 text-left font-semibold">Type</th>
          <th className="px-3 py-2 text-left font-semibold">CUSIP</th>
          <th className="px-3 py-2 text-left font-semibold">Security</th>
          <th className="px-3 py-2 text-left font-semibold">Quantity</th>
          <th className="px-3 py-2 text-left font-semibold">Notes</th>
        </tr>
      </thead>
      <tbody>
        {txs.length > 0 ? (
          txs.map((tx) => {
            const securityName = securitiesMap[tx.cusip] || tx.certificate_type || "-"
            return (
              <tr key={tx.id} className="border-t border-border hover:bg-accent transition-colors">
                <td className="px-3 py-2">
                  {tx.transaction_date
                    ? toUSDate(tx.transaction_date)
                    : "-"}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeBadgeColor(tx.transaction_type)}`}>
                    {tx.transaction_type || "-"}
                  </span>
                </td>
                <td className="px-3 py-2">{tx.cusip || "-"}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityBadgeColor(securityName)}`}>
                    {securityName}
                  </span>
                </td>
                <td className="px-3 py-2">{tx.share_quantity?.toLocaleString() || 0}</td>
                <td className="px-3 py-2 text-muted-foreground text-sm">{tx.notes || "-"}</td>
              </tr>
            )
          })
        ) : (
          <tr>
            <td colSpan={6} className="text-center py-4 text-muted-foreground">
              No transactions available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
})

export default memo(TransactionsTable);
