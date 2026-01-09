/**
 * Custom Hook: useSupabaseSWR
 * SWR wrapper for Supabase queries with caching
 *
 * Provides instant navigation by caching Supabase query results
 */

import useSWR, { SWRConfiguration } from 'swr'
import { createClient } from '@/lib/supabase/client'

interface UseSupabaseSWROptions extends SWRConfiguration {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

/**
 * Hook for fetching Supabase data with SWR caching
 *
 * @param key - Unique cache key (e.g., 'shareholders-123')
 * @param queryFn - Function that returns Supabase query result
 * @param options - SWR configuration
 *
 * @example
 * const { data, isLoading, error } = useSupabaseSWR(
 *   `shareholders-${issuerId}`,
 *   async () => {
 *     const supabase = createClient()
 *     const { data, error } = await supabase
 *       .from("shareholders_new")
 *       .select("*")
 *       .eq("issuer_id", issuerId)
 *     if (error) throw error
 *     return data
 *   }
 * )
 */
export function useSupabaseSWR<T = any>(
  key: string | null,
  queryFn: () => Promise<T>,
  options: UseSupabaseSWROptions = {}
) {
  const {
    revalidateOnFocus = false, // Don't revalidate on focus by default
    dedupingInterval = 60000, // Cache for 1 minute
    ...swrConfig
  } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    queryFn,
    {
      revalidateOnFocus,
      revalidateOnReconnect: false,
      dedupingInterval,
      ...swrConfig,
    }
  )

  return {
    data,
    isLoading,
    error,
    isValidating,
    mutate, // For manual cache refresh
  }
}
