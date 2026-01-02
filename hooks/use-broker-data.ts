import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

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
// QUERY KEYS - Centralized for instant cache invalidation
// ============================================================================
export const brokerQueryKeys = {
  all: ['broker'] as const,

  // Transfer Requests
  transferRequests: () => [...brokerQueryKeys.all, 'transfer-requests'] as const,
  transferRequestsByIssuer: (issuerId: string) =>
    [...brokerQueryKeys.transferRequests(), 'issuer', issuerId] as const,
  transferRequest: (requestId: string) =>
    [...brokerQueryKeys.transferRequests(), 'detail', requestId] as const,

  // Communications for a request
  communications: (requestId: string) =>
    [...brokerQueryKeys.all, 'communications', requestId] as const,

  // Broker Profile
  profile: () => [...brokerQueryKeys.all, 'profile'] as const,

  // Issuer data (for broker view)
  issuer: (issuerId: string) => [...brokerQueryKeys.all, 'issuer', issuerId] as const,
  issuerDocuments: (issuerId: string) => [...brokerQueryKeys.all, 'documents', issuerId] as const,
  issuerSecurities: (issuerId: string) => [...brokerQueryKeys.all, 'securities', issuerId] as const,
  issuerSplits: (issuerId: string) => [...brokerQueryKeys.all, 'splits', issuerId] as const,
}

// ============================================================================
// CACHE TIME CONSTANTS
// ============================================================================
const STALE_TIME = {
  SHORT: 30 * 1000,      // 30 seconds - for frequently changing data
  MEDIUM: 2 * 60 * 1000, // 2 minutes - for moderately changing data
  LONG: 5 * 60 * 1000,   // 5 minutes - for rarely changing data
  STATIC: 30 * 60 * 1000, // 30 minutes - for static configuration data
} as const

// ============================================================================
// TRANSFER REQUESTS HOOKS
// ============================================================================

/**
 * Fetch all transfer requests for the broker
 */
export function useTransferRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: brokerQueryKeys.transferRequests(),
    queryFn: () => fetcher<any[]>('/api/transfer-requests'),
    staleTime: STALE_TIME.SHORT,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch transfer requests filtered by issuer
 */
export function useTransferRequestsByIssuer(issuerId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: brokerQueryKeys.transferRequestsByIssuer(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/transfer-requests?issuerId=${issuerId}`),
    staleTime: STALE_TIME.SHORT,
    enabled: !!issuerId && (options?.enabled ?? true),
  })
}

/**
 * Fetch single transfer request detail
 */
export function useTransferRequest(requestId: string | null) {
  return useQuery({
    queryKey: brokerQueryKeys.transferRequest(requestId || ''),
    queryFn: () => fetcher<any>(`/api/transfer-requests?requestId=${requestId}`),
    staleTime: STALE_TIME.SHORT,
    enabled: !!requestId,
  })
}

/**
 * Fetch communications for a transfer request
 */
export function useTransferRequestCommunications(requestId: string | null) {
  return useQuery({
    queryKey: brokerQueryKeys.communications(requestId || ''),
    queryFn: () => fetcher<any[]>(`/api/transfer-requests/communications?requestId=${requestId}`),
    staleTime: STALE_TIME.SHORT,
    enabled: !!requestId,
  })
}

// ============================================================================
// BROKER PROFILE HOOKS
// ============================================================================

/**
 * Fetch broker profile
 */
export function useBrokerProfile() {
  return useQuery({
    queryKey: brokerQueryKeys.profile(),
    queryFn: () => fetcher<any>('/api/broker/profile'),
    staleTime: STALE_TIME.LONG,
  })
}

// ============================================================================
// ISSUER DATA HOOKS (for broker view)
// ============================================================================

/**
 * Fetch issuer details
 */
export function useBrokerIssuer(issuerId: string | null) {
  return useQuery({
    queryKey: brokerQueryKeys.issuer(issuerId || ''),
    queryFn: () => fetcher<any>(`/api/issuers/${issuerId}`),
    staleTime: STALE_TIME.LONG,
    enabled: !!issuerId,
  })
}

/**
 * Fetch issuer documents
 */
export function useBrokerIssuerDocuments(issuerId: string | null) {
  return useQuery({
    queryKey: brokerQueryKeys.issuerDocuments(issuerId || ''),
    queryFn: () => fetcher<any>(`/api/issuers/${issuerId}/documents`),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!issuerId,
  })
}

/**
 * Fetch issuer securities
 */
export function useBrokerIssuerSecurities(issuerId: string | null) {
  return useQuery({
    queryKey: brokerQueryKeys.issuerSecurities(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
    staleTime: STALE_TIME.LONG,
    enabled: !!issuerId,
  })
}

/**
 * Fetch issuer split ratios
 */
export function useBrokerIssuerSplits(issuerId: string | null) {
  return useQuery({
    queryKey: brokerQueryKeys.issuerSplits(issuerId || ''),
    queryFn: () => fetcher<any[]>(`/api/splits?issuerId=${issuerId}`),
    staleTime: STALE_TIME.STATIC,
    enabled: !!issuerId,
  })
}

/**
 * Fetch all issuer data in parallel (for information page)
 */
export function useBrokerIssuerData(issuerId: string | null) {
  const queries = useQueries({
    queries: [
      {
        queryKey: brokerQueryKeys.issuer(issuerId || ''),
        queryFn: () => fetcher<any>(`/api/issuers/${issuerId}`),
        staleTime: STALE_TIME.LONG,
        enabled: !!issuerId,
      },
      {
        queryKey: brokerQueryKeys.issuerSecurities(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/securities?issuerId=${issuerId}`),
        staleTime: STALE_TIME.LONG,
        enabled: !!issuerId,
      },
      {
        queryKey: brokerQueryKeys.issuerSplits(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/splits?issuerId=${issuerId}`),
        staleTime: STALE_TIME.STATIC,
        enabled: !!issuerId,
      },
      {
        queryKey: brokerQueryKeys.transferRequestsByIssuer(issuerId || ''),
        queryFn: () => fetcher<any[]>(`/api/transfer-requests?issuerId=${issuerId}`),
        staleTime: STALE_TIME.SHORT,
        enabled: !!issuerId,
      },
    ],
  })

  return {
    issuer: queries[0].data,
    securities: queries[1].data,
    splits: queries[2].data,
    transferRequests: queries[3].data,
    isLoading: queries.some(q => q.isLoading),
    isError: queries.some(q => q.isError),
    refetchAll: () => queries.forEach(q => q.refetch()),
  }
}

// ============================================================================
// MUTATIONS WITH CACHE INVALIDATION
// ============================================================================

interface CreateSplitRequestParams {
  issuerId: string
  requestType: string
  dtcParticipantNumber: string
  dwacSubmitted: boolean
  unitsQuantity: number
  classAQuantity: number
  warrantsQuantity: number
  unitsCusip: string
  classACusip: string
  warrantsCusip: string
  notes?: string
}

/**
 * Create broker split request with optimistic updates
 */
export function useCreateSplitRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateSplitRequestParams) => {
      const res = await fetch('/api/transfer-requests/broker-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create request')
      }
      return res.json()
    },
    // ⚡ INSTANT: Add new request to cache immediately
    onMutate: async (newRequest) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: brokerQueryKeys.transferRequests() })
      await queryClient.cancelQueries({
        queryKey: brokerQueryKeys.transferRequestsByIssuer(newRequest.issuerId)
      })

      // Snapshot previous values
      const previousRequests = queryClient.getQueryData(brokerQueryKeys.transferRequests())
      const previousIssuerRequests = queryClient.getQueryData(
        brokerQueryKeys.transferRequestsByIssuer(newRequest.issuerId)
      )

      // Optimistically add to cache with temp ID
      const optimisticRequest = {
        id: `temp-${Date.now()}`,
        request_number: 'Pending...',
        status: 'Pending',
        submitted_at: new Date().toISOString(),
        ...newRequest,
      }

      queryClient.setQueryData(
        brokerQueryKeys.transferRequests(),
        (old: any[] | undefined) => [optimisticRequest, ...(old || [])]
      )

      queryClient.setQueryData(
        brokerQueryKeys.transferRequestsByIssuer(newRequest.issuerId),
        (old: any[] | undefined) => [optimisticRequest, ...(old || [])]
      )

      return { previousRequests, previousIssuerRequests }
    },
    // ⚡ SUCCESS: Replace optimistic data with real data
    onSuccess: (data, variables) => {
      // Replace temp request with real one
      queryClient.setQueryData(
        brokerQueryKeys.transferRequests(),
        (old: any[] | undefined) =>
          old?.map(req => req.id?.startsWith('temp-') ? data : req) || [data]
      )
      queryClient.setQueryData(
        brokerQueryKeys.transferRequestsByIssuer(variables.issuerId),
        (old: any[] | undefined) =>
          old?.map(req => req.id?.startsWith('temp-') ? data : req) || [data]
      )
    },
    // ⚡ ERROR: Rollback to previous state
    onError: (err, variables, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(brokerQueryKeys.transferRequests(), context.previousRequests)
      }
      if (context?.previousIssuerRequests) {
        queryClient.setQueryData(
          brokerQueryKeys.transferRequestsByIssuer(variables.issuerId),
          context.previousIssuerRequests
        )
      }
    },
  })
}

/**
 * Send communication/comment with optimistic update
 */
export function useSendCommunication(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { message: string; isInternal?: boolean }) => {
      const res = await fetch('/api/transfer-requests/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          message: params.message,
          isInternal: params.isInternal || false,
        }),
      })
      if (!res.ok) throw new Error('Failed to send comment')
      return res.json()
    },
    // ⚡ INSTANT: Add comment to cache immediately
    onMutate: async (newComment) => {
      await queryClient.cancelQueries({ queryKey: brokerQueryKeys.communications(requestId) })

      const previousComms = queryClient.getQueryData(brokerQueryKeys.communications(requestId))

      const optimisticComment = {
        id: `temp-${Date.now()}`,
        message: newComment.message,
        created_at: new Date().toISOString(),
        user: { name: 'You' }, // Will be replaced with real user
      }

      queryClient.setQueryData(
        brokerQueryKeys.communications(requestId),
        (old: any[] | undefined) => [...(old || []), optimisticComment]
      )

      return { previousComms }
    },
    onSuccess: () => {
      // Refetch to get the real comment with proper user data
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.communications(requestId) })
    },
    onError: (err, variables, context) => {
      if (context?.previousComms) {
        queryClient.setQueryData(brokerQueryKeys.communications(requestId), context.previousComms)
      }
    },
  })
}

// ============================================================================
// PREFETCHING HOOKS
// ============================================================================

/**
 * Prefetch issuer data for broker information page
 */
export function usePrefetchBrokerIssuer() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(async (issuerId: string) => {
    if (!issuerId) return

    // Check if already cached
    const existingIssuer = queryClient.getQueryData(brokerQueryKeys.issuer(issuerId))
    if (existingIssuer) return // Already cached, skip

    // Prefetch all data in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.issuer(issuerId),
        queryFn: () => fetcher(`/api/issuers/${issuerId}`),
        staleTime: STALE_TIME.LONG,
      }),
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.issuerSecurities(issuerId),
        queryFn: () => fetcher(`/api/securities?issuerId=${issuerId}`),
        staleTime: STALE_TIME.LONG,
      }),
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.issuerSplits(issuerId),
        queryFn: () => fetcher(`/api/splits?issuerId=${issuerId}`),
        staleTime: STALE_TIME.STATIC,
      }),
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.transferRequestsByIssuer(issuerId),
        queryFn: () => fetcher(`/api/transfer-requests?issuerId=${issuerId}`),
        staleTime: STALE_TIME.SHORT,
      }),
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.issuerDocuments(issuerId),
        queryFn: () => fetcher(`/api/issuers/${issuerId}/documents`),
        staleTime: STALE_TIME.MEDIUM,
      }),
    ])
  }, [queryClient])

  return { prefetch }
}

/**
 * Prefetch request detail with communications
 */
export function usePrefetchRequestDetail() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(async (requestId: string) => {
    if (!requestId) return

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.transferRequest(requestId),
        queryFn: () => fetcher(`/api/transfer-requests?requestId=${requestId}`),
        staleTime: STALE_TIME.SHORT,
      }),
      queryClient.prefetchQuery({
        queryKey: brokerQueryKeys.communications(requestId),
        queryFn: () => fetcher(`/api/transfer-requests/communications?requestId=${requestId}`),
        staleTime: STALE_TIME.SHORT,
      }),
    ])
  }, [queryClient])

  return { prefetch }
}

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

/**
 * Hook for invalidating broker-related caches
 */
export function useInvalidateBrokerData() {
  const queryClient = useQueryClient()

  return useMemo(() => ({
    // Invalidate all broker data
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.all })
    },

    // Invalidate all transfer requests
    invalidateTransferRequests: () => {
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.transferRequests() })
    },

    // Invalidate transfer requests for specific issuer
    invalidateIssuerRequests: (issuerId: string) => {
      queryClient.invalidateQueries({
        queryKey: brokerQueryKeys.transferRequestsByIssuer(issuerId)
      })
    },

    // Invalidate specific request and its communications
    invalidateRequest: (requestId: string) => {
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.transferRequest(requestId) })
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.communications(requestId) })
    },

    // Invalidate issuer data
    invalidateIssuerData: (issuerId: string) => {
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.issuer(issuerId) })
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.issuerDocuments(issuerId) })
      queryClient.invalidateQueries({ queryKey: brokerQueryKeys.issuerSecurities(issuerId) })
    },

    // Remove stale data from cache (for logout, etc.)
    clearAll: () => {
      queryClient.removeQueries({ queryKey: brokerQueryKeys.all })
    },
  }), [queryClient])
}
