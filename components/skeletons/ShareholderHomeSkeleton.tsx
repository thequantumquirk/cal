'use client'

/**
 * ShareholderHomeSkeleton - Fast visual feedback for shareholder home page
 */

export function ShareholderProfileSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm mb-8">
      <div className="bg-primary rounded-t-md p-4 mb-2">
        <div className="h-5 w-24 bg-primary-foreground/20 rounded animate-pulse" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-5 w-full bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * ShareholderHoldingsTableSkeleton - Skeleton for holdings table
 */
export function ShareholderHoldingsTableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="bg-primary rounded-t-md p-4 mb-2">
        <div className="h-5 w-20 bg-primary-foreground/20 rounded animate-pulse" />
      </div>
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-3 py-2">
                  <div className="h-4 w-16 bg-primary-foreground/20 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-t border-border animate-pulse">
                <td className="px-3 py-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                </td>
                <td className="px-3 py-2">
                  <div className="h-4 w-20 bg-muted rounded mx-auto" />
                </td>
                <td className="px-3 py-2">
                  <div className="h-4 w-24 bg-muted rounded mx-auto" />
                </td>
                <td className="px-3 py-2">
                  <div className="h-4 w-12 bg-muted rounded mx-auto" />
                </td>
                <td className="px-3 py-2">
                  <div className="h-4 w-8 bg-muted rounded mx-auto" />
                </td>
                <td className="px-3 py-2">
                  <div className="h-4 w-6 bg-muted rounded mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
