import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetcher with error handling
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('API Error') as Error & { status: number }
    error.status = res.status
    throw error
  }
  return res.json()
}

// Query keys - centralized for easy invalidation
export const recordKeepingKeys = {
  all: ['record-keeping'] as const,
  securities: (issuerId: string) => [...recordKeepingKeys.all, 'securities', issuerId] as const,
  shareholders: (issuerId: string) => [...recordKeepingKeys.all, 'shareholders', issuerId] as const,
  transactions: (issuerId: string) => [...recordKeepingKeys.all, 'transactions', issuerId] as const,
  restrictionTemplates: (issuerId: string) => [...recordKeepingKeys.all, 'restriction-templates', issuerId] as const,
}

// Individual hooks for flexibility
export function useSecurities(issuerId: string | null) {
  return useQuery({
    queryKey: recordKeepingKeys.securities(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

export function useShareholders(issuerId: string | null) {
  return useQuery({
    queryKey: recordKeepingKeys.shareholders(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/shareholders?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

export function useRecordKeepingTransactions(issuerId: string | null) {
  return useQuery({
    queryKey: recordKeepingKeys.transactions(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/record-keeping-transactions?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

export function useRestrictionTemplates(issuerId: string | null) {
  return useQuery({
    queryKey: recordKeepingKeys.restrictionTemplates(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/restriction-templates?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

// Combined hook - fetches ALL data in parallel with single loading state
export function useRecordKeepingData(issuerId: string | null) {
  const results = useQueries({
    queries: [
      {
        queryKey: recordKeepingKeys.securities(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: recordKeepingKeys.shareholders(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/shareholders?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: recordKeepingKeys.transactions(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/record-keeping-transactions?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
      {
        queryKey: recordKeepingKeys.restrictionTemplates(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/restriction-templates?issuerId=${issuerId}`),
        enabled: !!issuerId,
      },
    ],
  })

  const [securitiesQuery, shareholdersQuery, transactionsQuery, templatesQuery] = results

  return {
    // Data
    securities: securitiesQuery.data ?? [],
    shareholders: shareholdersQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    restrictionTemplates: templatesQuery.data ?? [],

    // Loading states
    isLoading: results.some(r => r.isLoading),
    isRefetching: results.some(r => r.isRefetching),
    securitiesLoading: securitiesQuery.isLoading,
    shareholdersLoading: shareholdersQuery.isLoading,
    transactionsLoading: transactionsQuery.isLoading,
    templatesLoading: templatesQuery.isLoading,

    // Errors
    error: results.find(r => r.error)?.error ?? null,

    // Refetch functions
    refetchAll: () => Promise.all(results.map(r => r.refetch())),
    refetchSecurities: securitiesQuery.refetch,
    refetchShareholders: shareholdersQuery.refetch,
    refetchTransactions: transactionsQuery.refetch,
    refetchTemplates: templatesQuery.refetch,
  }
}

// Mutation hook for creating shareholders
export function useCreateShareholder(issuerId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shareholderData: any) => {
      const res = await fetch('/api/shareholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shareholderData, issuer_id: issuerId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create shareholder')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate shareholders cache - triggers automatic refetch
      if (issuerId) {
        queryClient.invalidateQueries({ queryKey: recordKeepingKeys.shareholders(issuerId) })
      }
    },
  })
}

// Hook to invalidate all record-keeping data (useful after imports/bulk operations)
export function useInvalidateRecordKeeping() {
  const queryClient = useQueryClient()

  return (issuerId: string) => {
    queryClient.invalidateQueries({ queryKey: recordKeepingKeys.securities(issuerId) })
    queryClient.invalidateQueries({ queryKey: recordKeepingKeys.shareholders(issuerId) })
    queryClient.invalidateQueries({ queryKey: recordKeepingKeys.transactions(issuerId) })
    queryClient.invalidateQueries({ queryKey: recordKeepingKeys.restrictionTemplates(issuerId) })
  }
}
