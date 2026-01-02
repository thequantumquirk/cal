import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { issuerDataKeys } from './use-issuer-data'

// Fetcher utility (matching use-issuer-data.ts pattern)
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('API Error') as Error & { status: number }
    error.status = res.status
    throw error
  }
  return res.json()
}

/**
 * Check if connection is slow (don't prefetch on slow connections)
 */
function shouldPrefetch(): boolean {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      return false
    }
  }
  return true
}

/**
 * Hook for prefetching issuer data
 * Used for issuer switcher prefetching
 */
export function usePrefetchIssuers() {
  const queryClient = useQueryClient()

  // Prefetch essential data for an issuer
  const prefetchIssuerEssentials = useCallback(
    async (issuerId: string) => {
      if (!issuerId) return

      // Don't prefetch on slow connections
      if (!shouldPrefetch()) {
        return
      }

      // Check if already cached (don't refetch)
      const existingData = queryClient.getQueryData(
        issuerDataKeys.shareholders(issuerId)
      )
      if (existingData) {
        // Data already cached, skip prefetch
        return
      }

      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: issuerDataKeys.shareholders(issuerId),
            queryFn: () =>
              fetcher<any[]>(`/api/shareholders?issuerId=${issuerId}`),
            staleTime: 300000, // 5 min cache
          }),

          queryClient.prefetchQuery({
            queryKey: issuerDataKeys.securities(issuerId),
            queryFn: () =>
              fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
            staleTime: 300000,
          }),

          queryClient.prefetchQuery({
            queryKey: issuerDataKeys.transactions(issuerId),
            queryFn: () =>
              fetcher<any[]>(
                `/api/record-keeping-transactions?issuerId=${issuerId}`
              ),
            staleTime: 300000,
          }),

          queryClient.prefetchQuery({
            queryKey: issuerDataKeys.issuer(issuerId),
            queryFn: () => fetcher<any>(`/api/issuers/${issuerId}`),
            staleTime: 300000,
          }),
        ])
      } catch (error) {
        // Fail silently - prefetch is optional
        console.warn(`Prefetch failed for issuer ${issuerId}:`, error)
      }
    },
    [queryClient]
  )

  // Prefetch top N issuers on app load (background, low priority)
  const prefetchTopIssuers = useCallback(
    (issuers: Array<{ issuer_id: string }>, count = 3) => {
      if (!issuers || issuers.length === 0) return

      const topIssuers = issuers.slice(0, count)

      topIssuers.forEach((issuer, index) => {
        // Use requestIdleCallback for non-blocking prefetch
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(
            () => prefetchIssuerEssentials(issuer.issuer_id),
            { timeout: 5000 } // Fallback after 5s
          )
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(
            () => prefetchIssuerEssentials(issuer.issuer_id),
            1000 * (index + 1) // Stagger by 1s each
          )
        }
      })
    },
    [prefetchIssuerEssentials]
  )

  return { prefetchIssuerEssentials, prefetchTopIssuers }
}

