import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { issuerDataKeys } from './use-issuer-data'

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
// TRANSACTION PROCESSING COMPOSITE HOOK
// Fetches: securities, shareholders, splits in parallel
// Joins: creates splitRatios map
// ============================================================================

export function useTransactionProcessingData(issuerId: string | null) {
  const queryClient = useQueryClient()

  const results = useQueries({
    queries: [
      {
        queryKey: issuerDataKeys.securities(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
        enabled: !!issuerId,
        staleTime: 30 * 1000, // 30s - match original SWR config
      },
      {
        queryKey: issuerDataKeys.shareholders(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/shareholders?issuerId=${issuerId}`),
        enabled: !!issuerId,
        staleTime: 30 * 1000,
      },
      {
        queryKey: issuerDataKeys.splits(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/splits?issuerId=${issuerId}`),
        enabled: !!issuerId,
        staleTime: 30 * 1000,
      },
      {
        queryKey: issuerDataKeys.restrictionTemplates(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/restriction-templates?issuerId=${issuerId}`),
        enabled: !!issuerId,
        staleTime: 60 * 1000, // 1 min - less frequently changing
      },
    ],
  })

  const [securitiesQuery, shareholdersQuery, splitsQuery, restrictionTemplatesQuery] = results

  // JOIN: Create splitRatios map from splits array
  const splitRatios = useMemo(() => {
    const ratiosMap: Record<string, { classA: number; rights: number }> = {}
    const splits = splitsQuery.data || []
    splits.forEach((s: any) => {
      if (s.transaction_type) {
        ratiosMap[s.transaction_type] = {
          classA: s.class_a_ratio || 0,
          rights: s.rights_ratio || 0,
        }
      }
    })
    return ratiosMap
  }, [splitsQuery.data])

  // Create securities lookup maps for quick access
  const securitiesByCusip = useMemo(() => {
    const map: Record<string, any> = {}
    const securities = securitiesQuery.data || []
    securities.forEach((s: any) => {
      if (s.cusip) map[s.cusip] = s
    })
    return map
  }, [securitiesQuery.data])

  const securitiesById = useMemo(() => {
    const map: Record<string, any> = {}
    const securities = securitiesQuery.data || []
    securities.forEach((s: any) => {
      if (s.id) map[s.id] = s
    })
    return map
  }, [securitiesQuery.data])

  // Create shareholders lookup map
  const shareholdersById = useMemo(() => {
    const map: Record<string, any> = {}
    const shareholders = shareholdersQuery.data || []
    shareholders.forEach((sh: any) => {
      if (sh.id) map[sh.id] = sh
    })
    return map
  }, [shareholdersQuery.data])

  return {
    // Raw data
    securities: securitiesQuery.data ?? [],
    shareholders: shareholdersQuery.data ?? [],
    splits: splitsQuery.data ?? [],
    restrictionTemplates: restrictionTemplatesQuery.data ?? [],

    // Joined/computed data
    splitRatios,
    securitiesByCusip,
    securitiesById,
    shareholdersById,

    // Loading states
    isLoading: results.some((r) => r.isLoading),
    isRefetching: results.some((r) => r.isRefetching),
    securitiesLoading: securitiesQuery.isLoading,
    shareholdersLoading: shareholdersQuery.isLoading,
    splitsLoading: splitsQuery.isLoading,
    restrictionTemplatesLoading: restrictionTemplatesQuery.isLoading,

    // Error
    error: results.find((r) => r.error)?.error ?? null,

    // Refetch functions
    refetchAll: () => Promise.all(results.map((r) => r.refetch())),
    refetchSecurities: securitiesQuery.refetch,
    refetchShareholders: shareholdersQuery.refetch,
    refetchSplits: splitsQuery.refetch,
    refetchRestrictionTemplates: restrictionTemplatesQuery.refetch,

    // Invalidation (for after mutations)
    invalidateAll: () => {
      if (issuerId) {
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.securities(issuerId) })
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareholders(issuerId) })
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.splits(issuerId) })
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.restrictionTemplates(issuerId) })
      }
    },
  }
}
