import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

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
// QUERY KEYS - Centralized for easy invalidation
// ============================================================================
export const issuerDataKeys = {
  all: ['issuer-data'] as const,

  // Base keys
  securities: (issuerId: string) => [...issuerDataKeys.all, 'securities', issuerId] as const,
  shareholders: (issuerId: string) => [...issuerDataKeys.all, 'shareholders', issuerId] as const,
  restrictionTemplates: (issuerId: string) => [...issuerDataKeys.all, 'restriction-templates', issuerId] as const,
  splits: (issuerId: string) => [...issuerDataKeys.all, 'splits', issuerId] as const,
  transactions: (issuerId: string) => [...issuerDataKeys.all, 'transactions', issuerId] as const,
  shareRestrictions: (issuerId: string) => [...issuerDataKeys.all, 'share-restrictions', issuerId] as const,
  shareholderRestrictions: (issuerId: string) => [...issuerDataKeys.all, 'shareholder-restrictions', issuerId] as const,
  users: () => [...issuerDataKeys.all, 'users'] as const,

  // Issuer-specific
  issuer: (issuerId: string) => [...issuerDataKeys.all, 'issuer', issuerId] as const,
  issuers: () => [...issuerDataKeys.all, 'issuers'] as const,

  // Shareholder-specific
  shareholderByEmail: (email: string) => [...issuerDataKeys.all, 'shareholder-by-email', email] as const,
  restrictions: (issuerId: string) => [...issuerDataKeys.all, 'restrictions', issuerId] as const,
}

// ============================================================================
// BASE HOOKS - Reusable across pages
// ============================================================================

/**
 * Fetch securities for an issuer
 */
export function useSecurities(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.securities(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch shareholders for an issuer
 */
export function useShareholders(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.shareholders(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/shareholders?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch restriction templates for an issuer
 */
export function useRestrictionTemplates(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.restrictionTemplates(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/restriction-templates?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch splits for an issuer
 */
export function useSplits(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.splits(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/splits?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch record-keeping transactions for an issuer
 */
export function useTransactions(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.transactions(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/record-keeping-transactions?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch share restrictions for an issuer
 */
export function useShareRestrictions(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.shareRestrictions(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/share-restrictions?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch shareholder restrictions for an issuer
 */
export function useShareholderRestrictions(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.shareholderRestrictions(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/shareholder-restrictions?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch all users (for admin pages)
 */
export function useUsers() {
  return useQuery({
    queryKey: issuerDataKeys.users(),
    queryFn: () => fetcher<any>(`/api/users`),
  })
}

/**
 * Fetch single issuer details
 */
export function useIssuer(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.issuer(issuerId || ''),
    queryFn: () => fetcher<any>(`/api/issuers/${issuerId}`),
    enabled: !!issuerId,
  })
}

/**
 * Fetch all issuers
 */
export function useIssuers() {
  return useQuery({
    queryKey: issuerDataKeys.issuers(),
    queryFn: () => fetcher<any[]>(`/api/issuers`),
  })
}

/**
 * Fetch shareholder data by email
 */
export function useShareholderByEmail(email: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.shareholderByEmail(email || ''),
    queryFn: () => fetcher<any>(`/api/shareholders?email=${encodeURIComponent(email || '')}`),
    enabled: !!email,
  })
}

/**
 * Fetch restrictions for an issuer (legend codes)
 */
export function useRestrictions(issuerId: string | null) {
  return useQuery({
    queryKey: issuerDataKeys.restrictions(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/restrictions?issuerId=${issuerId}`),
    enabled: !!issuerId,
  })
}

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Hook to invalidate all issuer-related data
 */
export function useInvalidateIssuerData() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: (issuerId: string) => {
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.securities(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareholders(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.restrictionTemplates(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.splits(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.transactions(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareRestrictions(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareholderRestrictions(issuerId) })
    },
    invalidateSecurities: (issuerId: string) =>
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.securities(issuerId) }),
    invalidateShareholders: (issuerId: string) =>
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareholders(issuerId) }),
    invalidateTransactions: (issuerId: string) =>
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.transactions(issuerId) }),
    invalidateRestrictions: (issuerId: string) => {
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareRestrictions(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.shareholderRestrictions(issuerId) })
      queryClient.invalidateQueries({ queryKey: issuerDataKeys.restrictionTemplates(issuerId) })
    },
  }
}
