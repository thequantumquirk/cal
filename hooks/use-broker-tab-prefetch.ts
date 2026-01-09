import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { brokerQueryKeys } from './use-broker-data'

// ============================================================================
// FETCHER
// ============================================================================
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('API Error') as Error & { status: number }
    error.status = res.status
    throw error
  }
  return res.json()
}

// ============================================================================
// TAB TYPES
// ============================================================================
type BrokerInfoTab = 'depository' | 'securities' | 'transfer'

// ============================================================================
// STALE TIMES
// ============================================================================
const STALE_TIME = {
  DOCUMENTS: 2 * 60 * 1000,  // 2 minutes
  SECURITIES: 5 * 60 * 1000, // 5 minutes
  REQUESTS: 30 * 1000,        // 30 seconds
  NOTES: 5 * 60 * 1000,       // 5 minutes
}

/**
 * Hook for prefetching tab data on hover/focus
 * Eliminates loading delay when switching tabs
 */
export function useBrokerTabPrefetch(issuerId: string | null) {
  const queryClient = useQueryClient()
  const prefetchTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  /**
   * Prefetch data for a specific tab
   * Debounced to avoid excessive prefetching on quick hovers
   */
  const prefetchTab = useCallback((tab: BrokerInfoTab) => {
    if (!issuerId) return

    // Clear existing timeout for this tab
    const existingTimeout = prefetchTimeoutRef.current.get(tab)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Debounce: wait 150ms before prefetching
    const timeout = setTimeout(async () => {
      try {
        switch (tab) {
          case 'depository':
            await queryClient.prefetchQuery({
              queryKey: brokerQueryKeys.issuerDocuments(issuerId),
              queryFn: () => fetcher(`/api/issuers/${issuerId}/documents`),
              staleTime: STALE_TIME.DOCUMENTS,
            })
            break

          case 'securities':
            // Prefetch both securities data and notes
            await Promise.all([
              queryClient.prefetchQuery({
                queryKey: brokerQueryKeys.issuerSecurities(issuerId),
                queryFn: () => fetcher(`/api/securities?issuerId=${issuerId}`),
                staleTime: STALE_TIME.SECURITIES,
              }),
              queryClient.prefetchQuery({
                queryKey: ['records-notes'] as const,
                queryFn: () => fetcher('/api/records-management/notes'),
                staleTime: STALE_TIME.NOTES,
              }),
            ])
            break

          case 'transfer':
            // Prefetch transfer requests
            await queryClient.prefetchQuery({
              queryKey: brokerQueryKeys.transferRequestsByIssuer(issuerId),
              queryFn: () => fetcher(`/api/transfer-requests?issuerId=${issuerId}`),
              staleTime: STALE_TIME.REQUESTS,
            })
            break
        }
      } catch (error) {
        // Fail silently - prefetch is optional
        console.warn(`Tab prefetch failed for ${tab}:`, error)
      } finally {
        prefetchTimeoutRef.current.delete(tab)
      }
    }, 150)

    prefetchTimeoutRef.current.set(tab, timeout)
  }, [issuerId, queryClient])

  /**
   * Prefetch adjacent tabs when hovering on one
   * Improves perceived performance for tab navigation
   */
  const prefetchAdjacentTabs = useCallback((currentTab: BrokerInfoTab) => {
    const adjacentTabs: Record<BrokerInfoTab, BrokerInfoTab[]> = {
      depository: ['securities'],
      securities: ['depository', 'transfer'],
      transfer: ['securities'],
    }

    adjacentTabs[currentTab]?.forEach(tab => prefetchTab(tab))
  }, [prefetchTab])

  /**
   * Cancel pending prefetches (on unmount or navigation)
   */
  const cancelPrefetches = useCallback(() => {
    prefetchTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
    prefetchTimeoutRef.current.clear()
  }, [])

  return {
    prefetchTab,
    prefetchAdjacentTabs,
    cancelPrefetches,
  }
}

/**
 * Hook for prefetching request detail when hovering on a row
 */
export function usePrefetchRequestOnHover() {
  const queryClient = useQueryClient()
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const prefetch = useCallback((requestId: string) => {
    if (!requestId) return

    // Clear existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }

    // Check if already cached
    const existingData = queryClient.getQueryData(
      brokerQueryKeys.transferRequest(requestId)
    )
    if (existingData) return

    // Debounce prefetch by 200ms
    prefetchTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: brokerQueryKeys.transferRequest(requestId),
            queryFn: () => fetcher(`/api/transfer-requests?requestId=${requestId}`),
            staleTime: 30 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: brokerQueryKeys.communications(requestId),
            queryFn: () => fetcher(`/api/transfer-requests/communications?requestId=${requestId}`),
            staleTime: 30 * 1000,
          }),
        ])
      } catch (error) {
        // Fail silently
      }
    }, 200)
  }, [queryClient])

  const cancel = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
      prefetchTimeoutRef.current = null
    }
  }, [])

  return { prefetch, cancel }
}

/**
 * Hook for intelligent prefetching based on user behavior
 * Tracks which issuers user interacts with and prefetches proactively
 */
export function useSmartPrefetch() {
  const queryClient = useQueryClient()

  /**
   * Called when user views an issuer - prefetch related data
   */
  const onIssuerView = useCallback(async (issuerId: string) => {
    if (!issuerId) return

    // Use requestIdleCallback for non-blocking prefetch
    const prefetchData = async () => {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: brokerQueryKeys.issuerSecurities(issuerId),
          queryFn: () => fetcher(`/api/securities?issuerId=${issuerId}`),
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: brokerQueryKeys.issuerSplits(issuerId),
          queryFn: () => fetcher(`/api/splits?issuerId=${issuerId}`),
          staleTime: 30 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: brokerQueryKeys.transferRequestsByIssuer(issuerId),
          queryFn: () => fetcher(`/api/transfer-requests?issuerId=${issuerId}`),
          staleTime: 30 * 1000,
        }),
      ])
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => prefetchData(), { timeout: 3000 })
    } else {
      setTimeout(prefetchData, 500)
    }
  }, [queryClient])

  /**
   * Called when user navigates to broker dashboard
   * Prefetches commonly accessed data
   */
  const onDashboardLoad = useCallback(async (availableIssuers: Array<{ issuer_id: string }>) => {
    if (!availableIssuers?.length) return

    // Prefetch first 3 issuers in background
    const topIssuers = availableIssuers.slice(0, 3)

    topIssuers.forEach((issuer, index) => {
      const prefetch = () => onIssuerView(issuer.issuer_id)

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(prefetch, { timeout: 5000 + index * 1000 })
      } else {
        setTimeout(prefetch, 1000 * (index + 1))
      }
    })
  }, [onIssuerView])

  return {
    onIssuerView,
    onDashboardLoad,
  }
}
