"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useRecordKeepingData, useCreateShareholder, recordKeepingKeys } from "@/hooks/use-record-keeping";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { toUSDate } from "@/lib/dateUtils";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  ArrowUpDown,
  Building,
  User,
  Search,
  Download,
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  Database,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Columns,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function RecordKeepingPage({ params: paramsPromise }) {
  const {
    user,
    userRole,
    currentIssuer,
    availableIssuers,
    issuerSpecificRole,
    loading: pageLoading,
    initialized,
    validateAndSetIssuer,
    canEdit,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [issuerId, setIssuerId] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCusip, setSelectedCusip] = useState("all");
  const [selectedSecurityType, setSelectedSecurityType] = useState("all");
  const [selectedShareholder, setSelectedShareholder] = useState("all");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Sorting states
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [urlRefreshing, setUrlRefreshing] = useState(false); // Loading state for URL-triggered refresh

  // Real-time update indicator
  const [realtimeUpdate, setRealtimeUpdate] = useState(null); // { type: 'INSERT', timestamp: Date.now() }
  const [realtimeRefreshing, setRealtimeRefreshing] = useState(false); // Loading state for real-time refresh
  const [lastUpdated, setLastUpdated] = useState(new Date()); // Track last data update time

  // Modal states
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddShareholder, setShowAddShareholder] = useState(false);
  const [showAddSecurity, setShowAddSecurity] = useState(false);

  // Column visibility configuration
  const allColumns = [
    { key: 'transaction_date', label: 'Date', defaultVisible: true },
    { key: 'cusip', label: 'CUSIP', defaultVisible: true },
    { key: 'issue_name', label: 'Issue Name', defaultVisible: true },
    { key: 'issue_ticker', label: 'Issue Ticker', defaultVisible: true },
    { key: 'trading_platform', label: 'Trading Platform', defaultVisible: false },
    { key: 'security_type', label: 'Security Type', defaultVisible: true },
    { key: 'transaction_type', label: 'Transaction Type', defaultVisible: true },
    { key: 'credit_debit', label: 'Credit/Debit', defaultVisible: true },
    { key: 'quantity', label: 'Quantity', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'certificate_type', label: 'Certificate Type', defaultVisible: false },
    { key: 'account_number', label: 'Account Number', defaultVisible: true },
    { key: 'shareholder_name', label: 'Shareholder Name', defaultVisible: true },
    { key: 'shareholder_first_name', label: 'First Name', defaultVisible: false },
    { key: 'shareholder_last_name', label: 'Last Name', defaultVisible: false },
    { key: 'address', label: 'Address', defaultVisible: false },
    { key: 'city', label: 'City', defaultVisible: false },
    { key: 'state', label: 'State', defaultVisible: false },
    { key: 'zip', label: 'Zip', defaultVisible: false },
    { key: 'country', label: 'Country', defaultVisible: false },
    { key: 'taxpayer_id', label: 'Taxpayer ID', defaultVisible: false },
    { key: 'tin_status', label: 'TIN Status', defaultVisible: false },
    { key: 'email', label: 'Email', defaultVisible: false },
    { key: 'phone', label: 'Phone', defaultVisible: false },
    { key: 'date_of_birth', label: 'Date of Birth', defaultVisible: false },
    { key: 'ownership_percentage', label: 'Ownership %', defaultVisible: false },
    { key: 'lei', label: 'LEI', defaultVisible: false },
    { key: 'holder_type', label: 'Holder Type', defaultVisible: false },
    { key: 'ofac_date', label: 'OFAC Date', defaultVisible: false },
    { key: 'ofac_results', label: 'OFAC Results', defaultVisible: false },
    { key: 'restriction_codes', label: 'Restrictions', defaultVisible: false },
    { key: 'notes', label: 'Notes', defaultVisible: false },
    { key: 'legal_documents', label: 'Legal Documents', defaultVisible: false },
  ];

  // Column visibility state - initialize from localStorage or defaults
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recordKeeping_visibleColumns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved columns:', e);
        }
      }
    }
    // Default: show only columns with defaultVisible: true
    return allColumns.filter(col => col.defaultVisible).map(col => col.key);
  });

  // Save visible columns to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recordKeeping_visibleColumns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const toggleAllColumns = (visible) => {
    if (visible) {
      setVisibleColumns(allColumns.map(col => col.key));
    } else {
      setVisibleColumns([]);
    }
  };

  const isColumnVisible = (columnKey) => visibleColumns.includes(columnKey);

  // Shareholder form state
  const [shareholderForm, setShareholderForm] = useState({
    account_number: '',
    shareholder_name: '',
    first_name: '',
    last_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    taxpayer_id: '',
    email: '',
    phone: '',
    date_of_birth: '',
    holder_type: ''
  });
  const [submittingShareholder, setSubmittingShareholder] = useState(false);

  // ⚡ CRITICAL: Use a stable key that includes the issuerId from params if state isn't set yet
  const effectiveIssuerId = issuerId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : null);

  // ⚡ TanStack Query - Fetches ALL data in parallel with automatic caching & revalidation
  const {
    securities,
    shareholders,
    transactions: enrichedTransactions,
    restrictionTemplates,
    isLoading: dataLoading,
    securitiesLoading,
    shareholdersLoading,
    transactionsLoading,
    templatesLoading,
    refetchAll,
    refetchSecurities,
    refetchShareholders,
    refetchTransactions,
    refetchTemplates,
  } = useRecordKeepingData(effectiveIssuerId);

  // Create shareholder mutation hook
  const createShareholderMutation = useCreateShareholder(effectiveIssuerId);

  // ⚡ URL Refresh: Handle ?refresh=true parameter (triggered from transaction processing page)
  useEffect(() => {
    // Use effectiveIssuerId to trigger refresh immediately, don't wait for state
    if (searchParams.get('refresh') === 'true' && effectiveIssuerId) {
      console.log('🔄 URL refresh parameter detected - triggering IMMEDIATE revalidation');
      setUrlRefreshing(true);

      // TanStack Query handles parallel refetching automatically
      refetchAll().then(() => {
        console.log('✅ Revalidation completed');
        setLastUpdated(new Date());
        setUrlRefreshing(false);
      });

      // Clean up URL to avoid repeated refreshes
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, effectiveIssuerId, refetchAll]);

  // ⚡ REALTIME: Optimistic UI updates with TanStack Query cache
  useEffect(() => {
    if (!issuerId) return;

    const supabase = createClient();
    console.log('🔌 Subscribing to realtime changes for issuer:', issuerId);

    const channel = supabase
      .channel(`transactions-${issuerId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transfers_new',
          filter: `issuer_id=eq.${issuerId}`
        },
        async (payload) => {
          console.log('⚡ REALTIME EVENT RECEIVED:', payload.eventType, payload);

          // Show visual indicator immediately
          setRealtimeUpdate({ type: payload.eventType, timestamp: Date.now() });
          setRealtimeRefreshing(true);

          try {
            const transactionsKey = recordKeepingKeys.transactions(issuerId);

            if (payload.eventType === 'INSERT' && payload.new) {
              // ⚡ OPTIMISTIC UPDATE - Add new transaction immediately
              console.log('➕ Optimistically adding new transaction:', payload.new.id);

              // Update cache directly without refetching
              queryClient.setQueryData(transactionsKey, (currentData) => {
                const safeData = currentData || [];
                if (safeData.some(t => t.id === payload.new.id)) return safeData;
                const updatedData = [payload.new, ...safeData];
                return updatedData.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
              });

              // Trigger background refetch for consistency after 1 second
              setTimeout(() => {
                console.log('🔄 Triggering full consistency refresh...');
                refetchAll();
              }, 1000);

            } else if (payload.eventType === 'UPDATE' && payload.new) {
              // 🔄 UPDATE - Replace existing transaction
              console.log('🔄 Optimistically updating transaction:', payload.new.id);

              queryClient.setQueryData(transactionsKey, (currentData) => {
                if (!currentData) return currentData;
                return currentData.map(t => t.id === payload.new.id ? payload.new : t);
              });

            } else if (payload.eventType === 'DELETE' && payload.old) {
              // ❌ DELETE - Remove transaction
              console.log('❌ Optimistically removing transaction:', payload.old.id);

              queryClient.setQueryData(transactionsKey, (currentData) => {
                if (!currentData) return currentData;
                return currentData.filter(t => t.id !== payload.old.id);
              });
            }

            // Update timestamp
            setLastUpdated(new Date());
            console.log('✅ Optimistic update complete');

          } catch (error) {
            console.error('❌ Realtime update error:', error);
            // Fallback: force full revalidation if optimistic update fails
            refetchAll();
          } finally {
            // Hide loading indicator after 1 second
            setTimeout(() => {
              setRealtimeRefreshing(false);
              setRealtimeUpdate(null);
            }, 1000);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Subscription status:', status);
      });

    // Cleanup function - prevents memory leaks
    return () => {
      console.log('🔌 Unsubscribing from realtime changes');
      supabase.removeChannel(channel);
    };
  }, [issuerId, queryClient, refetchAll]);

  // 🚀 BLAZING FAST: Unwrap params and set issuerId IMMEDIATELY - don't wait for auth!
  // This allows SWR to start fetching data in parallel with auth validation
  useEffect(() => {
    console.log('🔵 [RKB-PARAMS] useEffect TRIGGERED - Unwrapping params');
    const unwrapParams = async () => {
      try {
        const params = await paramsPromise;
        const id = params.issuerId;
        console.log('🟢 [RKB-PARAMS] Got issuerId:', id);
        // Set issuerId INSTANTLY - this triggers SWR data fetching immediately!
        setIssuerId(id);
        console.log('🟢 [RKB-PARAMS] Set issuerId in state');
      } catch (error) {
        console.error("🔴 [RKB-PARAMS] Error unwrapping params:", error);
      }
    };
    unwrapParams();
  }, []); // Run once on mount

  // 🚀 FAST AUTH: Validate access in parallel with data fetching
  // Track which issuer we've validated to prevent redundant calls
  const validatedIssuerRef = useRef(null);
  const validationCountRef = useRef(0);

  useEffect(() => {
    validationCountRef.current++;
    const callNumber = validationCountRef.current;
    console.log(`🟡 [RKB-VALIDATE #${callNumber}] useEffect TRIGGERED - initialized:`, initialized, 'user:', !!user, 'issuerId:', issuerId, 'validated:', validatedIssuerRef.current);

    if (!initialized || !user || !issuerId) {
      console.log(`🟠 [RKB-VALIDATE #${callNumber}] Skipping - Not ready (initialized:${initialized}, user:${!!user}, issuerId:${!!issuerId})`);
      return;
    }

    // Only validate if we haven't validated THIS specific issuer yet
    if (validatedIssuerRef.current === issuerId) {
      console.log(`🟢 [RKB-VALIDATE #${callNumber}] Already validated, SKIPPING`);
      return;
    }

    console.log(`🔵 [RKB-VALIDATE #${callNumber}] Running validation for issuerId:`, issuerId);

    const validateAccess = async () => {
      try {
        console.log(`🔵 [RKB-VALIDATE #${callNumber}] Calling validateAndSetIssuer...`);
        // Auth validation runs in PARALLEL with SWR data fetching!
        const authResult = await validateAndSetIssuer(issuerId);
        console.log(`🔵 [RKB-VALIDATE #${callNumber}] validateAndSetIssuer returned, hasAccess:`, authResult.hasAccess);

        if (!authResult.hasAccess) {
          console.log(`🔴 [RKB-VALIDATE #${callNumber}] NO ACCESS returned from validateAndSetIssuer`);

          // ⚡ SAFETY CHECK: If user is superadmin, they ALWAYS have access. 
          // If validateAndSetIssuer returned false, it might be a temporary glitch or race condition.
          // Don't redirect superadmins to avoid loops.
          if (userRole === 'superadmin') {
            console.log(`⚠️ [RKB-VALIDATE] User is superadmin, ignoring false access result to prevent loop`);
            validatedIssuerRef.current = issuerId; // Mark as validated anyway
            return;
          }

          console.log(`🔴 [RKB-VALIDATE #${callNumber}] Redirecting to home...`);
          router.push('/?error=no_access');
          return;
        }

        console.log(`🟢 [RKB-VALIDATE #${callNumber}] Validation successful, marking as validated`);
        // Mark this issuer as validated
        validatedIssuerRef.current = issuerId;
      } catch (error) {
        console.error(`🔴 [RKB-VALIDATE #${callNumber}] Error:`, error);
      }
    };

    validateAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user, issuerId]);

  // Moved checkAuthAndFetchData logic inline above

  // Manual refresh handler - force TanStack Query to refetch all data
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    try {
      await refetchAll();
      setLastUpdated(new Date());
      console.log('✅ Manual refresh complete');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ⚡ Use useMemo to compute enriched data - no useEffect needed!
  const enrichedData = useMemo(() => {
    if (securitiesLoading || shareholdersLoading || transactionsLoading || templatesLoading) {
      return null;
    }

    // Enrich transactions with security and shareholder data
    const securitiesMap = {};
    securities.forEach(s => securitiesMap[s.cusip] = s);

    const shareholdersMap = {};
    shareholders.forEach(sh => shareholdersMap[sh.id] = sh);

    const restrictionTemplatesMap = {};
    restrictionTemplates.forEach(rt => restrictionTemplatesMap[rt.id] = rt);

    const transactions = enrichedTransactions.map(transaction => {
      const security = securitiesMap[transaction.cusip];
      const shareholder = shareholdersMap[transaction.shareholder_id];
      const restrictionTemplate = transaction.restriction_id ? restrictionTemplatesMap[transaction.restriction_id] : null;

      return {
        ...transaction, // Preserve ALL original fields including restriction_codes
        issue_name: security?.issue_name || transaction.issue_name || '',
        issue_ticker: security?.issue_ticker || transaction.issue_ticker || '',
        trading_platform: security?.trading_platform || transaction.trading_platform || '',
        security_type: security?.class_name || transaction.security_type || '',
        certificate_type: transaction.certificate_type || 'Book Entry',
        cusip_details: security,
        account_number: shareholder?.account_number || transaction.account_number || '',
        shareholder_name: shareholder ? `${shareholder.first_name || ''} ${shareholder.last_name || ''}`.trim() : transaction.shareholder_name || '',
        shareholder_first_name: shareholder?.first_name || transaction.first_name || '',
        shareholder_last_name: shareholder?.last_name || transaction.last_name || '',
        address: shareholder?.address || transaction.address || '',
        city: shareholder?.city || transaction.city || '',
        state: shareholder?.state || transaction.state || '',
        zip: shareholder?.zip || transaction.zip || '',
        country: shareholder?.country || transaction.country || '',
        taxpayer_id: shareholder?.taxpayer_id || transaction.taxpayer_id || '',
        restriction_name: restrictionTemplate?.restriction_name || transaction.restriction_name || 'None',
        restriction_codes: transaction.restriction_codes || '',
      };
    });

    // Calculate stats
    const totalCredits = transactions.filter(t => t.transaction_type === 'Credit').reduce((sum, t) => sum + Number(t.share_quantity || 0), 0);
    const totalDebits = transactions.filter(t => t.transaction_type === 'Debit').reduce((sum, t) => sum + Number(t.share_quantity || 0), 0);
    const netOutstanding = totalCredits - totalDebits;

    return {
      securities,
      shareholders,
      transactions,
      restrictionTemplates,
      stats: {
        totalTransactions: transactions.length,
        totalCredits,
        totalDebits,
        netOutstanding,
      },
    };
  }, [securities, shareholders, enrichedTransactions, restrictionTemplates, securitiesLoading, shareholdersLoading, transactionsLoading, templatesLoading]);

  // Use enrichedData directly, fallback to empty state if loading
  const data = enrichedData || {
    securities: [],
    shareholders: [],
    transactions: [],
    restrictionTemplates: [],
    stats: { totalTransactions: 0, totalCredits: 0, totalDebits: 0, netOutstanding: 0 },
  };

  // ⚡ OPTIMIZED: Only show loading if we have NO data (not cached)
  // If SWR has cached data, show it immediately even during revalidation
  const loading = (securitiesLoading && !securities.length) ||
    (shareholdersLoading && !shareholders.length) ||
    (transactionsLoading && !enrichedTransactions.length) ||
    (templatesLoading && !restrictionTemplates.length);

  // Helper function for sorting - must be defined before useMemo
  const getSortValue = (transaction, field) => {
    switch (field) {
      case 'transaction_date':
        return new Date(transaction.transaction_date);
      case 'share_quantity':
      case 'quantity':
        return Number(transaction.share_quantity || transaction.quantity || 0);
      case 'ownership_percentage':
        return Number(transaction.ownership_percentage) || 0;
      case 'date_of_birth':
        return transaction.date_of_birth ? new Date(transaction.date_of_birth) : new Date(0);
      case 'ofac_date':
        return transaction.ofac_date ? new Date(transaction.ofac_date) : new Date(0);
      case 'shareholder_name':
        return `${transaction.shareholder_first_name || ''} ${transaction.shareholder_last_name || ''}`.trim().toLowerCase();
      default:
        return transaction[field] || '';
    }
  };

  // ✅ checkAuthAndFetchData moved inline to useEffect above to eliminate cascade
  // ✅ SWR hooks moved to top of component (before useEffects)

  // ⚡ Use useMemo for filtering - no useEffect needed!
  const filteredTransactions = useMemo(() => {
    let filtered = [...data.transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.shareholder_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          t.shareholder_first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          t.shareholder_last_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          t.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.cusip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.issue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.issue_ticker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.trading_platform
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          t.security_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.transaction_type
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          t.credit_debit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.certificate_type
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          t.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.zip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.taxpayer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.tin_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.holder_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.lei?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.notes?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // CUSIP filter
    if (selectedCusip !== "all") {
      filtered = filtered.filter((t) => t.cusip === selectedCusip);
    }

    // Security Type filter
    if (selectedSecurityType !== "all") {
      filtered = filtered.filter((t) =>
        t.security_type?.toLowerCase().includes(selectedSecurityType.toLowerCase())
      );
    }

    // Shareholder filter
    if (selectedShareholder !== "all") {
      filtered = filtered.filter(
        (t) => t.shareholder_id === selectedShareholder,
      );
    }

    // Transaction type filter
    if (selectedTransactionType !== "all") {
      filtered = filtered.filter(
        (t) => t.transaction_type === selectedTransactionType,
      );
    }

    // Date filters
    if (dateFrom) {
      filtered = filtered.filter((t) => t.transaction_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((t) => t.transaction_date <= dateTo);
    }

    // Apply sorting to filtered transactions
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = getSortValue(a, sortField);
        const bVal = getSortValue(b, sortField);

        // Handle different data types
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (aVal instanceof Date && bVal instanceof Date) {
          const dateCompare = sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

          // If dates are equal and sorting by transaction_date, use created_at as tiebreaker
          if (dateCompare === 0 && sortField === 'transaction_date' && a.created_at && b.created_at) {
            const aCreated = new Date(a.created_at);
            const bCreated = new Date(b.created_at);
            return sortDirection === 'asc' ? aCreated - bCreated : bCreated - aCreated;
          }

          return dateCompare;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filtered;
  }, [data.transactions, searchTerm, selectedCusip, selectedSecurityType, selectedShareholder, selectedTransactionType, dateFrom, dateTo, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCusip("all");
    setSelectedSecurityType("all");
    setSelectedShareholder("all");
    setSelectedTransactionType("all");
    setDateFrom("");
    setDateTo("");
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ✅ getSortValue moved to top before useMemo

  const SortableHeader = ({ field, children, className = "" }) => (
    <TableHead
      className={`whitespace-nowrap cursor-pointer hover:bg-muted select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        <ArrowUpDown className="ml-1 h-4 w-4" />
        {sortField === field && (
          <span className="ml-1 text-primary">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  const getRestrictionDescription = (code) => {
    // Look for restriction template with matching restriction_type (which is the code)
    const template = data.restrictionTemplates.find(t => t.restriction_type === code);
    return template?.description || getStaticRestrictionDescription(code);
  };

  const getStaticRestrictionDescription = (code) => {
    const staticDescriptions = {
      'A': 'Restricted securities that cannot be freely traded',
      'B': 'Securities subject to holding period requirements',
      'C': 'Securities restricted under Rule 144',
      'D': 'Insider trading restrictions apply',
      'E': 'Lock-up period restrictions',
      'F': 'Transfer restrictions due to agreement',
    };
    return staticDescriptions[code] || `Restriction code: ${code}`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handleAddShareholder = async () => {
    if (!shareholderForm.account_number.trim()) {
      alert('Account number is required');
      return;
    }

    if (!shareholderForm.first_name.trim()) {
      alert('First name is required');
      return;
    }

    setSubmittingShareholder(true);
    try {
      // Use TanStack Query mutation - automatically invalidates cache and refetches
      await createShareholderMutation.mutateAsync(shareholderForm);

      // Reset form and close modal
      setShareholderForm({
        account_number: '',
        shareholder_name: '',
        first_name: '',
        last_name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        taxpayer_id: '',
        email: '',
        phone: '',
        date_of_birth: '',
        holder_type: ''
      });
      setShowAddShareholder(false);

      alert('Shareholder added successfully!');
    } catch (error) {
      console.error('Error adding shareholder:', error);
      alert(error.message || 'Failed to add shareholder');
    } finally {
      setSubmittingShareholder(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "CUSIP",
      "Issue Name",
      "Issue Ticker",
      "Trading Platform",
      "Security Type",
      "Transaction Type",
      "Credit/Debit",
      "Quantity",
      "Status",
      "Certificate Type",
      "Account Number",
      "Shareholder Name",
      "First Name",
      "Last Name",
      "Address",
      "City",
      "State",
      "Zip",
      "Country",
      "Taxpayer ID",
      "TIN Status",
      "Email",
      "Phone",
      "Date of Birth",
      "Ownership %",
      "LEI",
      "Holder Type",
      "OFAC Date",
      "OFAC Results",
    ];

    const csvContent = [
      headers.join(","),
      ...currentTransactions.map((t) =>
        [
          t.transaction_date,
          t.cusip,
          t.issue_name,
          t.issue_ticker,
          t.trading_platform,
          t.security_type,
          t.transaction_type,
          t.credit_debit,
          t.quantity,
          t.status,
          t.certificate_type,
          t.account_number,
          t.shareholder_name,
          t.shareholder_first_name,
          t.shareholder_last_name,
          t.address,
          t.city,
          t.state,
          t.zip,
          t.country,
          t.taxpayer_id,
          t.tin_status,
          t.email,
          t.phone,
          t.date_of_birth,
          t.ownership_percentage,
          t.lei,
          t.holder_type,
          t.ofac_date,
          t.ofac_results,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `record-keeping-book-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // 🚀 ULTRA FAST: Only show loading spinner if we don't have issuerId yet
  // Don't wait for auth initialization - let the page render and data load in parallel!
  if (!issuerId) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar
          userRole={userRole}
          currentIssuerId={issuerId}
          issuerSpecificRole={issuerSpecificRole}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            userRole={userRole}
            currentIssuer={currentIssuer}
            availableIssuers={availableIssuers}
            issuerSpecificRole={issuerSpecificRole}
          />

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading RecordKeeping Book...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Permission checks using AuthContext

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={userRole}
        currentIssuerId={issuerId}
        issuerSpecificRole={issuerSpecificRole}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          userRole={userRole}
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-6">
              {/* Page Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      RecordKeeping Book
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Detailed, per-shareholder ledger for tracking all
                      transactions
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="transition-all duration-200"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                          onClick={() => setShowAddShareholder(true)}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Add Shareholder
                        </Button>
                        <Button
                          variant="outline"
                          className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                          onClick={() => setShowAddSecurity(true)}
                        >
                          <Building className="mr-2 h-4 w-4" />
                          Add Security
                        </Button>
                        <Button
                          className="bg-wealth-gradient !text-black font-semibold border-0"
                          onClick={() => setShowAddTransaction(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Transaction
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Outstanding Summary */}
              <Card className="card-glass border-0 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Current Outstanding Shares by CUSIP
                  </CardTitle>
                  <CardDescription>
                    Summary of total outstanding shares for each security
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">
                            CUSIP
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Issue Name
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Security Type
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Total Outstanding Shares
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Total Authorized Shares
                          </TableHead>

                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const outstandingByCusip = {};
                          data.transactions.forEach((transaction) => {
                            if (!outstandingByCusip[transaction.cusip]) {
                              outstandingByCusip[transaction.cusip] = {
                                cusip: transaction.cusip,
                                totalOutstanding: 0,
                                security: data.securities.find(
                                  (s) => s.cusip === transaction.cusip,
                                ),
                              };
                            }

                            const quantity = Number(transaction.quantity) || 0;
                            let isDebit = false;

                            if (transaction.credit_debit) {
                              const cdStr = String(transaction.credit_debit).toLowerCase();
                              isDebit = cdStr.includes('debit') || cdStr.includes('withdrawal');
                            } else {
                              // Fallback if credit_debit is missing
                              isDebit = transaction.transaction_type === "DWAC Withdrawal" ||
                                transaction.transaction_type === "Transfer Debit";
                            }

                            const netChange = isDebit ? -quantity : quantity;
                            outstandingByCusip[transaction.cusip].totalOutstanding += netChange;
                          });

                          return Object.values(outstandingByCusip).map((item) => (
                            <TableRow key={item.cusip}>
                              {/* ✅ CUSIP font normal */}
                              <TableCell className="whitespace-nowrap">
                                {item.cusip}
                              </TableCell>

                              {/* ✅ Issue name font normal */}
                              <TableCell className="whitespace-nowrap">
                                {item.security?.issue_name || "Unknown Security"}
                              </TableCell>

                              <TableCell className="whitespace-nowrap">
                                {item.security?.class_name ||
                                  item.security?.security_type ||
                                  "-"}
                              </TableCell>

                              {/* ✅ Total Outstanding font normal */}
                              <TableCell className="whitespace-nowrap">
                                {item.totalOutstanding.toLocaleString()}
                              </TableCell>

                              <TableCell className="whitespace-nowrap">
                                {(() => {
                                  // ✅ FIX: Only show Total Authorized for Class A and Class B
                                  const securityType = (item.security?.class_name || item.security?.security_type || "").toLowerCase();
                                  const isClassAOrB = securityType.includes("class a") || securityType.includes("class b");
                                  return isClassAOrB && item.security?.total_authorized_shares
                                    ? item.security.total_authorized_shares.toLocaleString()
                                    : "N/A";
                                })()}
                              </TableCell>


                            </TableRow>
                          ));
                        })()}
                      </TableBody>

                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Filters & Search */}
              <Card className="card-glass border-2 border-primary/20 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-5 w-5" />
                      Filters & Search
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                        onClick={exportToCSV}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      <div>
                        <Label>Search</Label>
                        <Input
                          placeholder="Search transactions..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>CUSIP</Label>
                        <Select
                          value={selectedCusip}
                          onValueChange={setSelectedCusip}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All CUSIPs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All CUSIPs</SelectItem>
                            {data.securities.map((security) => (
                              <SelectItem
                                key={security.id}
                                value={security.cusip}
                              >
                                {security.cusip} - {security.issue_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Security Type</Label>
                        <Select
                          value={selectedSecurityType}
                          onValueChange={setSelectedSecurityType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Security Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Security Types</SelectItem>
                            {Array.from(new Set(data.securities.map((s) => s.class_name).filter(Boolean))).map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Shareholder</Label>
                        <Select
                          value={selectedShareholder}
                          onValueChange={setSelectedShareholder}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Shareholders" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Shareholders</SelectItem>
                            {data.shareholders.map((shareholder) => (
                              <SelectItem
                                key={shareholder.id}
                                value={shareholder.id}
                              >
                                {shareholder.account_number} -{" "}
                                {shareholder.first_name} {shareholder.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Transaction Type</Label>
                        <Select
                          value={selectedTransactionType}
                          onValueChange={setSelectedTransactionType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="IPO">IPO</SelectItem>
                            <SelectItem value="DWAC Withdrawal">
                              DWAC Withdrawal
                            </SelectItem>
                            <SelectItem value="DWAC Deposit">
                              DWAC Deposit
                            </SelectItem>
                            <SelectItem value="Transfer Credit">
                              Transfer Credit
                            </SelectItem>
                            <SelectItem value="Transfer Debit">
                              Transfer Debit
                            </SelectItem>
                            <SelectItem value="Dividend">Dividend</SelectItem>
                            <SelectItem value="Stock Split">
                              Stock Split
                            </SelectItem>
                            <SelectItem value="Redemption">Redemption</SelectItem>
                            <SelectItem value="Cancellation">
                              Cancellation
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-64">
                        <Label>Date From</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => {
                            let value = e.target.value

                            // If year part > 4 digits, trim it
                            if (/^\d{5,}/.test(value)) {
                              const [year, month, day] = value.split("-")
                              value = `${year.slice(0, 4)}${month ? "-" + month : ""}${day ? "-" + day : ""}`
                            }

                            setDateFrom(value)
                          }}
                        />
                      </div>
                      <div className="w-64">
                        <Label>Date To</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => {
                            let value = e.target.value

                            // If year part > 4 digits, trim it
                            if (/^\d{5,}/.test(value)) {
                              const [year, month, day] = value.split("-")
                              value = `${year.slice(0, 4)}${month ? "-" + month : ""}${day ? "-" + day : ""}`
                            }

                            setDateTo(value)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Table */}
              <Card className="card-glass border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle>Transactions</CardTitle>
                        {realtimeUpdate && (
                          <Badge
                            className="bg-primary text-primary-foreground animate-pulse shadow-lg"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {realtimeUpdate.type === 'INSERT' && 'New transaction'}
                            {realtimeUpdate.type === 'UPDATE' && 'Transaction updated'}
                            {realtimeUpdate.type === 'DELETE' && 'Transaction deleted'}
                          </Badge>
                        )}
                        {(realtimeRefreshing || urlRefreshing) && (
                          <Badge
                            variant="outline"
                            className="border-primary text-primary"
                          >
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            {urlRefreshing ? 'Loading transaction data...' : 'Refreshing data...'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {filteredTransactions.length} transactions found
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Last Updated Timestamp */}
                      <div className="text-xs text-muted-foreground">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                      </div>

                      {/* Smart Reload Button (no longer hard reload) */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="border-primary hover:bg-primary/10 text-primary"
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Reload'}
                      </Button>

                      {/* Column Selector */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                          >
                            <Columns className="mr-2 h-4 w-4" />
                            Columns ({visibleColumns.length}/{allColumns.length})
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="end">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Toggle Columns</h4>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAllColumns(true)}
                                  className="h-7 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAllColumns(false)}
                                  className="h-7 text-xs"
                                >
                                  None
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {allColumns.map((column) => (
                                <div key={column.key} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`column-${column.key}`}
                                    checked={isColumnVisible(column.key)}
                                    onChange={() => toggleColumn(column.key)}
                                    className="rounded border-input text-primary focus:ring-primary"
                                  />
                                  <label
                                    htmlFor={`column-${column.key}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {column.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentTransactions.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <Database className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          No transactions found
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Try adjusting your filters or add your first
                          transaction to get started
                        </p>
                        {canEdit && (
                          <Button onClick={() => setShowAddTransaction(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Transaction
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto table-scrollbar">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {isColumnVisible('transaction_date') && (
                                <SortableHeader field="transaction_date">
                                  Date
                                </SortableHeader>
                              )}
                              {isColumnVisible('cusip') && (
                                <SortableHeader field="cusip">
                                  CUSIP
                                </SortableHeader>
                              )}
                              {isColumnVisible('issue_name') && (
                                <SortableHeader field="issue_name">
                                  Issue Name
                                </SortableHeader>
                              )}
                              {isColumnVisible('issue_ticker') && (
                                <SortableHeader field="issue_ticker">
                                  Issue Ticker
                                </SortableHeader>
                              )}
                              {isColumnVisible('trading_platform') && (
                                <SortableHeader field="trading_platform">
                                  Trading Platform
                                </SortableHeader>
                              )}
                              {isColumnVisible('security_type') && (
                                <SortableHeader field="security_type">
                                  Security Type
                                </SortableHeader>
                              )}
                              {isColumnVisible('transaction_type') && (
                                <SortableHeader field="transaction_type">
                                  Transaction Type
                                </SortableHeader>
                              )}
                              {isColumnVisible('credit_debit') && (
                                <SortableHeader field="credit_debit">
                                  Credit/Debit
                                </SortableHeader>
                              )}
                              {isColumnVisible('quantity') && (
                                <SortableHeader field="quantity">
                                  Quantity
                                </SortableHeader>
                              )}
                              {isColumnVisible('status') && (
                                <SortableHeader field="status">
                                  Status
                                </SortableHeader>
                              )}
                              {isColumnVisible('certificate_type') && (
                                <SortableHeader field="certificate_type">
                                  Certificate Type
                                </SortableHeader>
                              )}
                              {isColumnVisible('account_number') && (
                                <SortableHeader field="account_number">
                                  Account Number
                                </SortableHeader>
                              )}
                              {isColumnVisible('shareholder_name') && (
                                <SortableHeader field="shareholder_name">
                                  Shareholder Name
                                </SortableHeader>
                              )}
                              {isColumnVisible('shareholder_first_name') && (
                                <SortableHeader field="shareholder_first_name">
                                  First Name
                                </SortableHeader>
                              )}
                              {isColumnVisible('shareholder_last_name') && (
                                <SortableHeader field="shareholder_last_name">
                                  Last Name
                                </SortableHeader>
                              )}
                              {isColumnVisible('address') && (
                                <SortableHeader field="address">
                                  Address
                                </SortableHeader>
                              )}
                              {isColumnVisible('city') && (
                                <SortableHeader field="city">
                                  City
                                </SortableHeader>
                              )}
                              {isColumnVisible('state') && (
                                <SortableHeader field="state">
                                  State
                                </SortableHeader>
                              )}
                              {isColumnVisible('zip') && (
                                <SortableHeader field="zip">
                                  Zip
                                </SortableHeader>
                              )}
                              {isColumnVisible('country') && (
                                <SortableHeader field="country">
                                  Country
                                </SortableHeader>
                              )}
                              {isColumnVisible('taxpayer_id') && (
                                <SortableHeader field="taxpayer_id">
                                  Taxpayer ID
                                </SortableHeader>
                              )}
                              {isColumnVisible('tin_status') && (
                                <SortableHeader field="tin_status">
                                  TIN Status
                                </SortableHeader>
                              )}
                              {isColumnVisible('email') && (
                                <SortableHeader field="email">
                                  Email
                                </SortableHeader>
                              )}
                              {isColumnVisible('phone') && (
                                <SortableHeader field="phone">
                                  Phone
                                </SortableHeader>
                              )}
                              {isColumnVisible('date_of_birth') && (
                                <SortableHeader field="date_of_birth">
                                  Date of Birth
                                </SortableHeader>
                              )}
                              {isColumnVisible('ownership_percentage') && (
                                <SortableHeader field="ownership_percentage">
                                  Ownership %
                                </SortableHeader>
                              )}
                              {isColumnVisible('lei') && (
                                <SortableHeader field="lei">
                                  LEI
                                </SortableHeader>
                              )}
                              {isColumnVisible('holder_type') && (
                                <SortableHeader field="holder_type">
                                  Holder Type
                                </SortableHeader>
                              )}
                              {isColumnVisible('ofac_date') && (
                                <SortableHeader field="ofac_date">
                                  OFAC Date
                                </SortableHeader>
                              )}
                              {isColumnVisible('ofac_results') && (
                                <SortableHeader field="ofac_results">
                                  OFAC Results
                                </SortableHeader>
                              )}
                              {isColumnVisible('restriction_codes') && (
                                <SortableHeader field="restriction_codes">
                                  Restrictions
                                </SortableHeader>
                              )}
                              {isColumnVisible('notes') && (
                                <SortableHeader field="notes">
                                  Notes
                                </SortableHeader>
                              )}
                              {isColumnVisible('legal_documents') && (
                                <SortableHeader field="legal_documents">
                                  Legal Documents
                                </SortableHeader>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentTransactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                {isColumnVisible('transaction_date') && (
                                  <TableCell className="whitespace-nowrap">
                                    {toUSDate(transaction.transaction_date) || '-'}
                                  </TableCell>
                                )}
                                {isColumnVisible('cusip') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.cusip}
                                  </TableCell>
                                )}
                                {isColumnVisible('issue_name') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.issue_name}
                                  </TableCell>
                                )}
                                {isColumnVisible('issue_ticker') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.issue_ticker}
                                  </TableCell>
                                )}
                                {isColumnVisible('trading_platform') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.trading_platform}
                                  </TableCell>
                                )}
                                {isColumnVisible('security_type') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.security_type}
                                  </TableCell>
                                )}
                                {isColumnVisible('transaction_type') && (
                                  <TableCell className="whitespace-nowrap">
                                    <Badge variant="outline">
                                      {transaction.transaction_type}
                                    </Badge>
                                  </TableCell>
                                )}
                                {isColumnVisible('credit_debit') && (
                                  <TableCell className="whitespace-nowrap">
                                    <Badge
                                      variant={
                                        transaction.credit_debit === "Credit"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {transaction.credit_debit}
                                    </Badge>
                                  </TableCell>
                                )}
                                {isColumnVisible('quantity') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.quantity?.toLocaleString()}
                                  </TableCell>
                                )}
                                {isColumnVisible('status') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.status}
                                  </TableCell>
                                )}
                                {isColumnVisible('certificate_type') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.certificate_type}
                                  </TableCell>
                                )}
                                {isColumnVisible('account_number') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.account_number}
                                  </TableCell>
                                )}
                                {isColumnVisible('shareholder_name') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.shareholder_name}
                                  </TableCell>
                                )}
                                {isColumnVisible('shareholder_first_name') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.shareholder_first_name}
                                  </TableCell>
                                )}
                                {isColumnVisible('shareholder_last_name') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.shareholder_last_name}
                                  </TableCell>
                                )}
                                {isColumnVisible('address') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.address}
                                  </TableCell>
                                )}
                                {isColumnVisible('city') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.city}
                                  </TableCell>
                                )}
                                {isColumnVisible('state') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.state}
                                  </TableCell>
                                )}
                                {isColumnVisible('zip') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.zip}
                                  </TableCell>
                                )}
                                {isColumnVisible('country') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.country}
                                  </TableCell>
                                )}
                                {isColumnVisible('taxpayer_id') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.taxpayer_id}
                                  </TableCell>
                                )}
                                {isColumnVisible('tin_status') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.tin_status}
                                  </TableCell>
                                )}
                                {isColumnVisible('email') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.email}
                                  </TableCell>
                                )}
                                {isColumnVisible('phone') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.phone}
                                  </TableCell>
                                )}
                                {isColumnVisible('date_of_birth') && (
                                  <TableCell className="whitespace-nowrap">
                                    {toUSDate(transaction.date_of_birth) || "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('ownership_percentage') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.ownership_percentage
                                      ? `${transaction.ownership_percentage}%`
                                      : "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('lei') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.lei || "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('holder_type') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.holder_type || "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('ofac_date') && (
                                  <TableCell className="whitespace-nowrap">
                                    {toUSDate(transaction.ofac_date) || "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('ofac_results') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.ofac_results || "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('restriction_codes') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.restriction_codes && typeof transaction.restriction_codes === 'string' && transaction.restriction_codes.trim() ? (
                                      <div className="flex flex-wrap gap-1">
                                        {transaction.restriction_codes
                                          .split(", ")
                                          .filter(code => code && code.trim())
                                          .map((code, index) => (
                                            <Popover key={index}>
                                              <PopoverTrigger asChild>
                                                <Badge
                                                  variant="outline"
                                                  className="mr-1 mb-1 cursor-help hover:bg-muted"
                                                >
                                                  {code}
                                                </Badge>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-80" side="top">
                                                <div className="space-y-2">
                                                  <h4 className="font-semibold text-sm">
                                                    Restriction: {code}
                                                  </h4>
                                                  <p className="text-sm text-muted-foreground">
                                                    {getRestrictionDescription(code)}
                                                  </p>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          ))}
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                )}
                                {isColumnVisible('notes') && (
                                  <TableCell className="whitespace-nowrap">
                                    {transaction.notes || "-"}
                                  </TableCell>
                                )}
                                {isColumnVisible('legal_documents') && (
                                  <TableCell className="whitespace-nowrap">
                                    {(() => {
                                      // Simple check: if notes contain legal authorization, show the legal doc indicator
                                      const notes = transaction.notes || "";
                                      const hasLegalDoc = notes.includes("--- LEGAL AUTHORIZATION DOCUMENT ---");

                                      if (hasLegalDoc) {
                                        // Extract URL (any URL in the notes)
                                        const urlMatch = notes.match(/https?:\/\/[^\s\n]+/);
                                        const documentUrl = urlMatch ? urlMatch[0] : null;

                                        return (
                                          <div className="flex items-center space-x-2">
                                            {documentUrl ? (
                                              <a
                                                href={documentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-1 text-primary hover:text-primary/80 text-sm"
                                                title="View legal authorization document"
                                              >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                  <path d="M8 12a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                </svg>
                                                <span>Legal Document</span>
                                              </a>
                                            ) : (
                                              <div className="flex items-center space-x-1 text-muted-foreground text-sm">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                </svg>
                                                <span>Legal Document</span>
                                              </div>
                                            )}
                                            <div className="px-2 py-1 bg-secondary/20 text-secondary-foreground text-xs rounded">
                                              Legal Auth
                                            </div>
                                          </div>
                                        );
                                      }

                                      return "-";
                                    })()}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-8 px-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            Showing <span className="text-foreground font-semibold">{startIndex + 1}</span> to{" "}
                            <span className="text-foreground font-semibold">{Math.min(endIndex, filteredTransactions.length)}</span> of{" "}
                            <span className="text-foreground font-semibold">{filteredTransactions.length}</span> results
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="h-9 px-3 border-border/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <div className="flex items-center gap-1 mx-2">
                              {(() => {
                                const pageNumbers = [];
                                const maxVisible = 7;

                                if (totalPages <= maxVisible) {
                                  // Show all pages if total is less than max
                                  for (let i = 1; i <= totalPages; i++) {
                                    pageNumbers.push(i);
                                  }
                                } else {
                                  // Always show first page
                                  pageNumbers.push(1);

                                  if (currentPage > 3) {
                                    pageNumbers.push('...');
                                  }

                                  // Show pages around current page
                                  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                                    if (!pageNumbers.includes(i)) {
                                      pageNumbers.push(i);
                                    }
                                  }

                                  if (currentPage < totalPages - 2) {
                                    pageNumbers.push('...');
                                  }

                                  // Always show last page
                                  if (!pageNumbers.includes(totalPages)) {
                                    pageNumbers.push(totalPages);
                                  }
                                }

                                return pageNumbers.map((page, idx) => {
                                  if (page === '...') {
                                    return (
                                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                                        ...
                                      </span>
                                    );
                                  }

                                  const isActive = currentPage === page;
                                  return (
                                    <Button
                                      key={page}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(page)}
                                      className={`h-9 w-9 p-0 border transition-all ${isActive
                                        ? "bg-wealth-gradient !text-black font-bold border-[#ffd900] shadow-lg scale-110"
                                        : "border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                                        }`}
                                    >
                                      {page}
                                    </Button>
                                  );
                                });
                              })()}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="h-9 px-3 border-border/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Add Transaction Modal */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Add a new transaction to the recordKeeping book
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CUSIP</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select CUSIP" />
                </SelectTrigger>
                <SelectContent>
                  {data.securities.map((security) => (
                    <SelectItem key={security.id} value={security.cusip}>
                      {security.cusip} - {security.issue_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shareholder</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Shareholder" />
                </SelectTrigger>
                <SelectContent>
                  {data.shareholders.map((shareholder) => (
                    <SelectItem key={shareholder.id} value={shareholder.id}>
                      {shareholder.account_number} - {shareholder.first_name}{" "}
                      {shareholder.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPO">IPO</SelectItem>
                  <SelectItem value="DWAC Withdrawal">
                    DWAC Withdrawal
                  </SelectItem>
                  <SelectItem value="DWAC Deposit">DWAC Deposit</SelectItem>
                  <SelectItem value="Transfer Credit">
                    Transfer Credit
                  </SelectItem>
                  <SelectItem value="Transfer Debit">Transfer Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit/Debit</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit">Credit</SelectItem>
                  <SelectItem value="Debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" placeholder="Enter quantity" />
            </div>
            <div>
              <Label>Transaction Date</Label>
              <Input type="date" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Enter notes (optional)" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddTransaction(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowAddTransaction(false)}>
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Shareholder Modal */}
      <Dialog open={showAddShareholder} onOpenChange={setShowAddShareholder}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Shareholder</DialogTitle>
            <DialogDescription>
              Add a new shareholder to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Account Number *</Label>
              <Input
                placeholder="Enter account number"
                value={shareholderForm.account_number}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, account_number: e.target.value }))}
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                placeholder="Enter shareholder name"
                value={shareholderForm.shareholder_name}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, shareholder_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>First Name *</Label>
              <Input
                placeholder="Enter first name"
                value={shareholderForm.first_name}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                placeholder="Enter last name"
                value={shareholderForm.last_name}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input
                placeholder="Enter address"
                value={shareholderForm.address}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                placeholder="Enter city"
                value={shareholderForm.city}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                placeholder="Enter state"
                value={shareholderForm.state}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div>
              <Label>Zip</Label>
              <Input
                placeholder="Enter zip code"
                value={shareholderForm.zip}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, zip: e.target.value }))}
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                placeholder="Enter country"
                value={shareholderForm.country}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, country: e.target.value }))}
              />
            </div>
            <div>
              <Label>Taxpayer ID</Label>
              <Input
                placeholder="Enter taxpayer ID"
                value={shareholderForm.taxpayer_id}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, taxpayer_id: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter email"
                value={shareholderForm.email}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="Enter phone number"
                value={shareholderForm.phone}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={shareholderForm.date_of_birth}
                onChange={(e) => setShareholderForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
              />
            </div>
            <div>
              <Label>Holder Type</Label>
              <Select
                value={shareholderForm.holder_type}
                onValueChange={(value) => setShareholderForm(prev => ({ ...prev, holder_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Depository">Depository</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                  <SelectItem value="Corporation">Corporation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddShareholder(false)}
              disabled={submittingShareholder}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddShareholder}
              disabled={submittingShareholder || !shareholderForm.account_number.trim() || !shareholderForm.first_name.trim()}
            >
              {submittingShareholder ? "Adding..." : "Add Shareholder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Security Modal */}
      <Dialog open={showAddSecurity} onOpenChange={setShowAddSecurity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Security</DialogTitle>
            <DialogDescription>
              Add a new security to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CUSIP</Label>
              <Input
                placeholder="Enter 9-digit CUSIP or N/A for Class B"
                maxLength={9}
                pattern="[0-9]{9}|N/A"
              />
            </div>
            <div>
              <Label>Issue Name</Label>
              <Input placeholder="Enter issue name" />
            </div>
            <div>
              <Label>Issue Ticker</Label>
              <Input placeholder="Enter ticker" />
            </div>
            <div>
              <Label>Trading Platform</Label>
              <Input placeholder="Enter platform" />
            </div>
            <div>
              <Label>Security Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Units">Units</SelectItem>
                  <SelectItem value="Class A">Class A</SelectItem>
                  <SelectItem value="Class B">Class B</SelectItem>
                  <SelectItem value="Rights">Rights</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total Authorized Shares</Label>
              <Input
                type="number"
                placeholder="Enter total authorized shares"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSecurity(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddSecurity(false)}>
              Add Security
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
