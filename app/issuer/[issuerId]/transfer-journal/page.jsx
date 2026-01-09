"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import useSWR from "swr"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"

// Dynamic imports for heavy components
const TransferJournalTable = dynamic(() => import("@/components/transfer-journal-table"), {
  ssr: false,
  loading: () => <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div></div>
})
const TransferJournalView = dynamic(() => import("@/components/transfer-journal-view"), { ssr: false })
import { Button } from "@/components/ui/button"

async function getTransferJournalData(issuerId, userRole) {
  const supabase = createClient()

  // For superadmins without issuer context, show global data
  if (userRole === 'superadmin' && !issuerId) {
    // Get all transfer journal records
    const { data: rawRecords, error: recordsError } = await supabase
      .from("transfers_new")
      .select("*, issuers_new(issuer_name)")
      .order("transaction_date", { ascending: false })

    if (recordsError) {
      console.error("Error fetching all transfer journal records:", recordsError)
    }

    // Get all securities for enrichment
    const { data: securities, error: securitiesError } = await supabase
      .from("securities_new")
      .select("*")

    if (securitiesError) {
      console.error("Error fetching all securities:", securitiesError)
    }

    // Create securities lookup map
    const securitiesMap = {}
    securities?.forEach(security => {
      securitiesMap[security.cusip] = security
    })

    // Enrich records with credit_debit derivation and security details
    const records = rawRecords?.map(record => {
      // Determine credit_debit based on transaction_type
      let credit_debit = 'Credit' // Default to Credit
      if (record.transaction_type?.includes('Withdrawal') || 
          record.transaction_type?.includes('Debit') ||
          record.transaction_type?.includes('DWAC Withdrawal')) {
        credit_debit = 'Debit'
      } else if (record.transaction_type?.includes('Credit') ||
                 record.transaction_type?.includes('Deposit') ||
                 record.transaction_type?.includes('IPO') ||
                 record.transaction_type?.includes('DWAC Deposit')) {
        credit_debit = 'Credit'
      }

      const security = securitiesMap[record.cusip] || null
      
      return {
        ...record,
        credit_debit, // Add the derived field
        security_type: security?.security_type || 'Unknown',
        issue_name: security?.issue_name || '',
        issue_ticker: security?.issue_ticker || ''
      }
    }) || []

    // Get all shareholders
    const { data: shareholders, error: shareholdersError } = await supabase
      .from("shareholders_new")
      .select("*, issuers_new(issuer_name)")
      .order("first_name")

    if (shareholdersError) {
      console.error("Error fetching all shareholders:", shareholdersError)
    }

    return {
      records: records || [],
      shareholders: shareholders || [],
      scope: 'global'
    }
  }

  // For issuer-specific data
  if (!issuerId) {
    return {
      records: [],
      shareholders: [],
      scope: 'no_issuer'
    }
  }

  // Get issuer-specific transfer journal records
  const { data: rawRecords, error: recordsError } = await supabase
    .from("transfers_new")
    .select("*, issuers_new(issuer_name)")
    .eq("issuer_id", issuerId)
    .order("transaction_date", { ascending: false })

  if (recordsError) {
    console.error("Error fetching issuer transfer journal records:", recordsError)
  }

  // Get securities for enrichment
  const { data: securities, error: securitiesError } = await supabase
    .from("securities_new")
    .select("*")
    .eq("issuer_id", issuerId)

  if (securitiesError) {
    console.error("Error fetching securities:", securitiesError)
  }

  // Create securities lookup map
  const securitiesMap = {}
  securities?.forEach(security => {
    securitiesMap[security.cusip] = security
  })

  // Enrich records with credit_debit derivation and security details
  const records = rawRecords?.map(record => {
    // Determine credit_debit based on transaction_type
    let credit_debit = 'Credit' // Default to Credit
    if (record.transaction_type?.includes('Withdrawal') || 
        record.transaction_type?.includes('Debit') ||
        record.transaction_type?.includes('DWAC Withdrawal')) {
      credit_debit = 'Debit'
    } else if (record.transaction_type?.includes('Credit') ||
               record.transaction_type?.includes('Deposit') ||
               record.transaction_type?.includes('IPO') ||
               record.transaction_type?.includes('DWAC Deposit')) {
      credit_debit = 'Credit'
    }

    const security = securitiesMap[record.cusip] || null
    
    return {
      ...record,
      credit_debit, // Add the derived field
      security_type: security?.security_type || security?.class_name || 'Unknown',
      issue_name: security?.issue_name || '',
      issue_ticker: security?.issue_ticker || ''
    }
  }) || []

  // Get issuer-specific shareholders
  const { data: shareholders, error: shareholdersError } = await supabase
    .from("shareholders_new")
    .select("*, issuers_new(issuer_name)")
    .eq("issuer_id", issuerId)
    .order("first_name")

  if (shareholdersError) {
    console.error("Error fetching issuer shareholders:", shareholdersError)
  }

  return {
    records: records || [],
    shareholders: shareholders || [],
    scope: 'issuer'
  }
}

export default function TransferJournalPage({ params: paramsPromise }) {
  const { user, userRole, userRoles, currentIssuer, availableIssuers, issuerSpecificRole, loading, initialized, validateAndSetIssuer } = useAuth()
  const router = useRouter()
  const [issuerId, setIssuerId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(0) // ⚡ NEW: Force refresh counter

  // ⚡ FIX: Prevent infinite loop with ref guard
  const hasLoadedRef = useRef(false);

  // ⚡ NEW: Reset everything when component mounts or currentIssuer changes
  useEffect(() => {
    console.log('🔄 Component mounted or issuer changed, resetting state');
    hasLoadedRef.current = false;
    setAuthChecked(false);
    setForceRefresh(prev => prev + 1); // Trigger SWR to refetch
  }, [currentIssuer?.id]);

  // ⚡ CRITICAL FIX: Extract issuerId FIRST before SWR
  useEffect(() => {
    console.log('🔍 useEffect fired:', { hasLoadedRef: hasLoadedRef.current, initialized, user: !!user });

    // ⚡ FIX: Only skip if already loaded AND we have the data we need
    if (hasLoadedRef.current && issuerId && authChecked) {
      console.log('🔍 Already loaded, skipping');
      return;
    }

    if (!initialized || !user) {
      console.log('🔍 Not ready yet - initialized:', initialized, 'user:', !!user);
      return;
    }

    const loadData = async () => {
      try {
        const params = await paramsPromise;
        const id = params?.issuerId;

        console.log('🔍 Got params:', { id, params });

        hasLoadedRef.current = true;

        setIssuerId(id);
        console.log('🔍 Set issuerId:', id);

        if (!user) {
          router.push('/login');
          return;
        }

        // Just validate auth - SWR handles data fetching
        const authResult = await validateAndSetIssuer(id);
        console.log('🔍 Auth result:', authResult);

        if (!authResult.hasAccess) {
          router.push('/?error=no_access');
          return;
        }

        setAuthChecked(true);
        console.log('🔍 Auth checked, ready to fetch data');
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user])

  // ⚡ SWR AGGRESSIVE CACHING - Use API route instead of client-side function
  const fetcher = async ([id, role, refresh]) => {
    console.log('🔄 Fetcher called:', { id, role, refresh });

    if (!id) {
      // For superadmins without issuer, return empty data
      // TODO: Create global API endpoint for superadmin view
      return { records: [], shareholders: [], scope: 'no_issuer' };
    }

    // ⚡ OPTIMIZED: Parallel fetching (refresh param forces cache bust)
    const [transferRes, shareholdersRes] = await Promise.all([
      fetch(`/api/transfer-journal?issuerId=${id}&_=${refresh}`),
      fetch(`/api/shareholders?issuerId=${id}&_=${refresh}`)
    ]);

    if (!transferRes.ok) {
      console.error('Transfer journal fetch failed:', transferRes.status, transferRes.statusText);
      throw new Error('Failed to fetch transfer journal');
    }

    // Both APIs return arrays directly
    const [records, shareholders] = await Promise.all([
      transferRes.json(),
      shareholdersRes.ok ? shareholdersRes.json() : []
    ]);

    console.log('✅ Fetcher got data:', {
      recordsCount: records?.length,
      shareholdersCount: shareholders?.length,
      firstRecord: records?.[0]
    });

    return {
      records: records || [],
      shareholders: shareholders || [],
      scope: 'issuer'
    };
  };

  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: true,
    dedupingInterval: 300000, // 5 min
    refreshInterval: 0,
    shouldRetryOnError: false,
    revalidateIfStale: false,
  };

  // Debug the SWR key - include forceRefresh to trigger re-fetch
  const swrKey = authChecked && userRole && issuerId !== undefined
    ? [issuerId, userRole, forceRefresh]
    : null;
  console.log('🔍 SWR Key:', { swrKey, authChecked, userRole, issuerId, forceRefresh });

  const { data: transferData, mutate: mutateTransferData, isLoading: swrLoading } = useSWR(
    swrKey,
    fetcher,
    swrConfig
  );

  console.log('🔍 SWR State:', { swrLoading, hasData: !!transferData, transferData });

  const pageLoading = swrLoading || !transferData

  // ⚡ PROGRESSIVE LOADING: Only block during auth init
  if (!initialized) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate stats - safe defaults with better null handling
  const records = transferData?.records || []
  const shareholders = transferData?.shareholders || []
  const scope = transferData?.scope || 'issuer'

  // 🐛 DEBUG: Log what we're getting
  console.log('Transfer Journal Debug:', {
    transferData,
    hasTransferData: !!transferData,
    recordsCount: records?.length,
    recordsSample: records?.[0],
    swrLoading,
    authChecked,
    issuerId,
    userRole,
    pageLoading
  })


  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} currentIssuerId={issuerId} issuerSpecificRole={issuerSpecificRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={user} 
          userRole={userRole} 
          userRoles={userRoles}
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-6">
              {pageLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading transfer journal data...</p>
                  </div>
                </div>
              ) : (
                <>
              {/* Main Content Area */}
              <div className="space-y-6">
                <TransferJournalView
                  records={records}
                  shareholders={shareholders}
                  userRole={userRole}
                  issuerId={issuerId}
                  currentIssuer={currentIssuer}
                />
              </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}


