"use client";

import { SWRConfig } from 'swr';

export function SWRProvider({ children }) {
  return (
    <SWRConfig
      value={{
        // ⚡ Global SWR configuration - applies to ALL useSWR calls
        dedupingInterval: 300000, // 5 min - prevents duplicate requests
        focusThrottleInterval: 300000, // 5 min - throttle refetch on focus
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        // Global fetcher
        fetcher: async (url) => {
          const res = await fetch(url);
          if (!res.ok) {
            const error = new Error('API Error');
            error.status = res.status;
            throw error;
          }
          return res.json();
        },
        // Enable SWR cache sharing across all components
        provider: () => new Map(),
      }}
    >
      {children}
    </SWRConfig>
  );
}
