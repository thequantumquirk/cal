/**
 * Shared SWR Hooks
 * Eliminates duplicate API calls by providing centralized data fetching hooks
 * All components using the same hook will share the same cache
 */

import useSWR, { SWRConfiguration } from 'swr'
import { fetcher } from '@/lib/fetcher'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 300000, // 5 minutes
  refreshInterval: 0,
  shouldRetryOnError: false,
  revalidateIfStale: false,
}

/**
 * Shared hook for fetching shareholders data
 * All components using this hook will share the same cache
 */
export function useShareholdersData(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/shareholders?issuerId=${issuerId}` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching issuer data
 */
export function useIssuerData(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/issuers/${issuerId}` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching issuers list
 */
export function useIssuersData(options: SWRConfiguration = {}) {
  return useSWR(
    '/api/issuers',
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching issuer statistics
 */
export function useIssuerStatistics(options: SWRConfiguration = {}) {
  return useSWR(
    '/api/issuers/statistics',
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching transfer journal data
 */
export function useTransferJournalData(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/transfer-journal?issuerId=${issuerId}` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching transactions
 */
export function useTransactions(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/issuers/${issuerId}/transactions` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching documents
 */
export function useDocuments(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/issuers/${issuerId}/documents` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching pending invitations
 */
export function usePendingInvitations(options: SWRConfiguration = {}) {
  return useSWR(
    '/api/invitations/pending',
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching securities
 */
export function useSecurities(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/securities?issuerId=${issuerId}` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching shareholder positions
 */
export function useShareholderPositions(issuerId: string | null, options: SWRConfiguration = {}) {
  return useSWR(
    issuerId ? `/api/shareholder-positions?issuerId=${issuerId}` : null,
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching roles
 */
export function useRoles(options: SWRConfiguration = {}) {
  return useSWR(
    '/api/roles',
    fetcher,
    { ...defaultConfig, ...options }
  )
}

/**
 * Shared hook for fetching users
 */
export function useUsers(options: SWRConfiguration = {}) {
  return useSWR(
    '/api/users',
    fetcher,
    { ...defaultConfig, ...options }
  )
}
