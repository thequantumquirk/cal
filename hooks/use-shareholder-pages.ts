import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
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
// SHAREHOLDER HOME PAGE HOOK
// Fetches: shareholder data by email (includes profile + holdings)
// ============================================================================

export function useShareholderHomeData(email: string | null) {
  const query = useQuery({
    queryKey: issuerDataKeys.shareholderByEmail(email || ''),
    queryFn: () => fetcher<any>(`/api/shareholders?email=${encodeURIComponent(email || '')}`),
    enabled: !!email,
    staleTime: 60 * 1000, // 1 minute
  })

  // Extract profile and holdings from API response structure: { profile, profiles, holdings }
  const profile = useMemo(() => {
    const data = query.data
    if (!data?.profile) return null
    return data.profile
  }, [query.data])

  const holdings = useMemo(() => {
    const data = query.data
    if (!data?.holdings) return []
    return data.holdings
  }, [query.data])

  return {
    // Raw data
    data: query.data,

    // Extracted data
    profile,
    holdings,

    // States
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,

    // Actions
    refetch: query.refetch,
  }
}

// ============================================================================
// SHAREHOLDER ISSUER PAGE HOOK
// Fetches: issuer details, shareholder holdings by email, restrictions
// Joins: filters holdings to specific issuer
// ============================================================================

export function useShareholderIssuerData(issuerId: string | null, email: string | null) {
  const queryClient = useQueryClient()

  const results = useQueries({
    queries: [
      {
        queryKey: issuerDataKeys.issuer(issuerId || ''),
        queryFn: () => fetcher<any>(`/api/issuers/${issuerId}`),
        enabled: !!issuerId,
        staleTime: 60 * 1000, // 1 minute
      },
      {
        queryKey: issuerDataKeys.shareholderByEmail(email || ''),
        queryFn: () => fetcher<any>(`/api/shareholders?email=${encodeURIComponent(email || '')}`),
        enabled: !!email,
        staleTime: 60 * 1000,
      },
      {
        queryKey: issuerDataKeys.restrictions(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/restrictions?issuerId=${issuerId}`),
        enabled: !!issuerId,
        staleTime: 60 * 1000,
      },
    ],
  })

  const [issuerQuery, shareholderQuery, restrictionsQuery] = results

  // JOIN: Filter holdings to only this issuer
  const filteredHoldings = useMemo(() => {
    const holdingsData = shareholderQuery.data?.holdings || []
    if (!issuerId) return holdingsData
    return holdingsData.filter((h: any) => h.issuer?.id === issuerId)
  }, [shareholderQuery.data, issuerId])

  // Extract issuer details
  const issuer = useMemo(() => {
    return issuerQuery.data || null
  }, [issuerQuery.data])

  // Split US Counsel utility
  const counselInfo = useMemo(() => {
    const usCounsel = issuer?.us_counsel || ''
    if (!usCounsel) return { issuerCounsel: '', underwritersCounsel: '' }

    // Try to split by common delimiters
    const parts = usCounsel.split(/[;,]/).map((s: string) => s.trim())
    if (parts.length >= 2) {
      return {
        issuerCounsel: parts[0],
        underwritersCounsel: parts[1],
      }
    }
    return { issuerCounsel: usCounsel, underwritersCounsel: '' }
  }, [issuer?.us_counsel])

  // Extract shareholder profile from API response structure: { profile, profiles, holdings }
  const shareholderProfile = useMemo(() => {
    const data = shareholderQuery.data
    if (!data?.profile) return null
    return data.profile
  }, [shareholderQuery.data])

  return {
    // Raw data
    issuer,
    shareholderData: shareholderQuery.data,
    restrictions: restrictionsQuery.data?.restrictions ?? [],

    // Joined/computed data
    filteredHoldings,
    shareholderProfile,
    counselInfo,

    // All holdings (unfiltered)
    allHoldings: shareholderQuery.data?.holdings ?? [],

    // Loading states
    isLoading: results.some((r) => r.isLoading),
    isRefetching: results.some((r) => r.isRefetching),
    issuerLoading: issuerQuery.isLoading,
    holdingsLoading: shareholderQuery.isLoading,
    restrictionsLoading: restrictionsQuery.isLoading,

    // Error
    error: results.find((r) => r.error)?.error ?? null,

    // Refetch
    refetchAll: () => Promise.all(results.map((r) => r.refetch())),
    refetchIssuer: issuerQuery.refetch,
    refetchHoldings: shareholderQuery.refetch,
    refetchRestrictions: restrictionsQuery.refetch,
  }
}

// ============================================================================
// INFORMATION PAGE HOOK (Issuers list)
// Fetches: all issuers
// ============================================================================

export function useInformationPageData() {
  const query = useQuery({
    queryKey: issuerDataKeys.issuers(),
    queryFn: () => fetcher<any[]>(`/api/issuers`),
    staleTime: 5 * 60 * 1000, // 5 minutes - issuers list rarely changes
  })

  return {
    issuers: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  }
}
