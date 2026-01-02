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
// RESTRICTIONS PAGE COMPOSITE HOOK
// Fetches: restriction-templates, share-restrictions, shareholder-restrictions,
//          transactions, shareholders, securities, users
// Joins: merges manual + transaction-based restrictions into combinedRestrictions
// ============================================================================

export function useRestrictionsPageData(issuerId: string | null) {
  const queryClient = useQueryClient()

  const results = useQueries({
    queries: [
      {
        queryKey: issuerDataKeys.restrictionTemplates(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/restriction-templates?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: issuerDataKeys.shareRestrictions(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/share-restrictions?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: issuerDataKeys.shareholderRestrictions(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/shareholder-restrictions?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: issuerDataKeys.transactions(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/record-keeping-transactions?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: issuerDataKeys.shareholders(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/shareholders?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: issuerDataKeys.securities(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: issuerDataKeys.users(),
        queryFn: () => fetcher<any>(`/api/users`),
        enabled: !!issuerId,
      },
    ],
  })

  const [
    restrictionTemplatesQuery,
    shareRestrictionsQuery,
    shareholderRestrictionsQuery,
    transactionsQuery,
    shareholdersQuery,
    securitiesQuery,
    usersQuery,
  ] = results

  // JOIN: Merge manual restrictions + transaction-based restrictions
  const combinedRestrictions = useMemo(() => {
    const shareholderRestrictions = shareholderRestrictionsQuery.data || []
    const transactionBasedRestrictions = transactionsQuery.data || []

    // Manual restrictions (source: 'manual')
    const manualRestrictions = shareholderRestrictions.map((r: any) => ({
      ...r,
      source: 'manual',
      source_label: 'Manual',
    }))

    // Transaction-based restrictions (source: 'transaction')
    // Aggregate by shareholder_id + cusip + restriction_id
    const txRestrictions: Record<string, any> = {}
    transactionBasedRestrictions
      .filter((t: any) => t.restriction_id)
      .forEach((transaction: any) => {
        const key = `${transaction.shareholder_id}-${transaction.cusip}-${transaction.restriction_id}`
        if (!txRestrictions[key]) {
          txRestrictions[key] = {
            id: `tx-${key}`,
            shareholder_id: transaction.shareholder_id,
            restriction_id: transaction.restriction_id,
            cusip: transaction.cusip,
            restricted_shares: transaction.share_quantity || 0,
            restriction_date: transaction.transaction_date,
            source: 'transaction',
            source_label: 'Transaction',
            transaction_id: transaction.id,
          }
        } else {
          txRestrictions[key].restricted_shares += transaction.share_quantity || 0
        }
      })

    return [...manualRestrictions, ...Object.values(txRestrictions)]
  }, [shareholderRestrictionsQuery.data, transactionsQuery.data])

  // Create lookup maps for quick access
  const restrictionTemplatesById = useMemo(() => {
    const map: Record<string, any> = {}
    const templates = restrictionTemplatesQuery.data || []
    templates.forEach((rt: any) => {
      if (rt.id) map[rt.id] = rt
    })
    return map
  }, [restrictionTemplatesQuery.data])

  const shareholdersById = useMemo(() => {
    const map: Record<string, any> = {}
    const shareholders = shareholdersQuery.data || []
    shareholders.forEach((sh: any) => {
      if (sh.id) map[sh.id] = sh
    })
    return map
  }, [shareholdersQuery.data])

  const securitiesByCusip = useMemo(() => {
    const map: Record<string, any> = {}
    const securities = securitiesQuery.data || []
    securities.forEach((s: any) => {
      if (s.cusip) map[s.cusip] = s
    })
    return map
  }, [securitiesQuery.data])

  // Enrich combined restrictions with shareholder and template details
  const enrichedRestrictions = useMemo(() => {
    return combinedRestrictions.map((r: any) => {
      const shareholder = shareholdersById[r.shareholder_id]
      const template = restrictionTemplatesById[r.restriction_id]
      const security = securitiesByCusip[r.cusip]

      return {
        ...r,
        shareholder_name: shareholder
          ? `${shareholder.first_name || ''} ${shareholder.last_name || ''}`.trim()
          : 'Unknown',
        shareholder_account: shareholder?.account_number || '',
        restriction_type: template?.restriction_type || '',
        restriction_name: template?.restriction_name || '',
        restriction_description: template?.description || '',
        security_name: security?.issue_name || r.cusip,
      }
    })
  }, [combinedRestrictions, shareholdersById, restrictionTemplatesById, securitiesByCusip])

  return {
    // Raw data
    restrictionTemplates: restrictionTemplatesQuery.data ?? [],
    shareRestrictions: shareRestrictionsQuery.data ?? [],
    shareholderRestrictions: shareholderRestrictionsQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    shareholders: shareholdersQuery.data ?? [],
    securities: securitiesQuery.data ?? [],
    users: usersQuery.data?.users ?? [],

    // Joined/computed data
    combinedRestrictions,
    enrichedRestrictions,
    restrictionTemplatesById,
    shareholdersById,
    securitiesByCusip,

    // Loading states
    isLoading: results.some((r) => r.isLoading),
    isRefetching: results.some((r) => r.isRefetching),

    // Error
    error: results.find((r) => r.error)?.error ?? null,

    // Refetch functions
    refetchAll: () => Promise.all(results.map((r) => r.refetch())),

    // Invalidation helpers
    invalidateRestrictions: () => {
      if (issuerId) {
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareRestrictions(issuerId) })
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareholderRestrictions(issuerId) })
        queryClient.invalidateQueries({ queryKey: issuerDataKeys.transactions(issuerId) })
      }
    },
    invalidateAll: () => {
      if (issuerId) {
        results.forEach((_, idx) => {
          queryClient.invalidateQueries({ queryKey: results[idx].queryKey })
        })
      }
    },
  }
}
