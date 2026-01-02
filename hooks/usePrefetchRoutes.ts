import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
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
 * Hook for prefetching route data on hover
 * Uses debouncing to prevent excessive prefetching
 */
export function usePrefetchRoutes() {
  const queryClient = useQueryClient()
  const prefetchTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchForRoute = useCallback(
    async (issuerId: string, route: string) => {
      if (!issuerId || !route) return

      // Don't prefetch on slow connections
      if (!shouldPrefetch()) {
        return
      }

      // Debounce: Clear existing timeout for this route to avoid multiple prefetches
      const key = `${issuerId}-${route}`
      const existing = prefetchTimeoutRef.current.get(key)
      if (existing) {
        clearTimeout(existing)
      }

      // Wait 200ms before prefetching (user might move mouse away quickly)
      const timeout = setTimeout(async () => {
        try {
          // Check if data is already cached (avoid redundant requests)
          const existingData = queryClient.getQueryData(
            issuerDataKeys.shareholders(issuerId)
          )
          if (existingData) {
            // Data already cached, no need to prefetch
            prefetchTimeoutRef.current.delete(key)
            return
          }

          // Map routes to their data requirements
          const routePrefetchMap: Record<string, () => Promise<void>> = {
            dashboard: async () => {
              await Promise.all([
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.shareholders(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/shareholders?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.transactions(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/record-keeping-transactions?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
              ])
            },

            'record-keeping': async () => {
              await Promise.all([
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.transactions(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/record-keeping-transactions?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.shareholders(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/shareholders?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.securities(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/securities?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
              ])
            },

            shareholder: async () => {
              await queryClient.prefetchQuery({
                queryKey: issuerDataKeys.shareholders(issuerId),
                queryFn: () =>
                  fetcher<any[]>(
                    `/api/shareholders?issuerId=${issuerId}`
                  ),
                staleTime: 60000,
              })
            },

            'transaction-processing': async () => {
              await Promise.all([
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.securities(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/securities?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.shareholders(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/shareholders?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.splits(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(`/api/splits?issuerId=${issuerId}`),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.restrictionTemplates(
                    issuerId
                  ),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/restriction-templates?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
              ])
            },

            restrictions: async () => {
              await Promise.all([
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.restrictionTemplates(
                    issuerId
                  ),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/restriction-templates?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.shareholderRestrictions(
                    issuerId
                  ),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/shareholder-restrictions?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
              ])
            },

            'transfer-journal': async () => {
              await Promise.all([
                queryClient.prefetchQuery({
                  queryKey: ['transfer-journal', issuerId],
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/transfer-journal?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.shareholders(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/shareholders?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
              ])
            },

            'control-book': async () => {
              await Promise.all([
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.securities(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/securities?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
                queryClient.prefetchQuery({
                  queryKey: issuerDataKeys.transactions(issuerId),
                  queryFn: () =>
                    fetcher<any[]>(
                      `/api/record-keeping-transactions?issuerId=${issuerId}`
                    ),
                  staleTime: 60000,
                }),
              ])
            },

            statements: async () => {
              await queryClient.prefetchQuery({
                queryKey: issuerDataKeys.shareholders(issuerId),
                queryFn: () =>
                  fetcher<any[]>(
                    `/api/shareholders?issuerId=${issuerId}`
                  ),
                staleTime: 60000,
              })
            },
          }

          const prefetcher = routePrefetchMap[route]
          if (prefetcher) {
            await prefetcher()
          }
        } catch (error) {
          // Fail silently - prefetch is optional and shouldn't break anything
          console.warn(`Prefetch failed for route: ${route}`, error)
        } finally {
          prefetchTimeoutRef.current.delete(key)
        }
      }, 200)

      prefetchTimeoutRef.current.set(key, timeout)
    },
    [queryClient]
  )

  return { prefetchForRoute }
}

