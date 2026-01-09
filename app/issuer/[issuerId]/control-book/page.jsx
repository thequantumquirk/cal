"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
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
  Lock,
  Shield,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toUSDate } from "@/lib/dateUtils";

// Stable empty array references to prevent infinite re-renders
const EMPTY_ARRAY = [];

export default function ControlBookPage({ params: paramsPromise }) {
  const [issuerId, setIssuerId] = useState(null);
  const {
    user,
    userRole,
    currentIssuer,
    availableIssuers,
    issuerSpecificRole,
    loading: authLoading,
    initialized,
    validateAndSetIssuer,
    canEdit,
  } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({
    securities: [],
    controlBookData: [],
  });
  const [activeTab, setActiveTab] = useState(""); // Will be set to first CUSIP
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCusip, setSelectedCusip] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting states
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Modal states
  const [showAddSecurity, setShowAddSecurity] = useState(false);

  // Refresh handler - force SWR to refetch all data bypassing cache
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refetch all data from server bypassing cache
      await Promise.all([
        mutateSecurities(),
        mutateTransferTransactions()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ⚡ SUPER FAST SWR CACHING - Instant page loads after first visit
  const swrFetcher = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
    return res.json();
  };

  const swrConfig = {
    revalidateOnFocus: true,      // ✅ Always refresh when tab gains focus
    revalidateOnReconnect: true,  // ✅ Always refresh when connection restored  
    dedupingInterval: 0,          // ✅ No deduplication - always fetch fresh
    revalidateIfStale: true,      // ✅ Always revalidate stale data
    refreshInterval: 0,           // ✅ No polling
    shouldRetryOnError: false,    // ✅ Don't retry on error
  };

  const { data: securitiesData, isLoading: securitiesLoading, mutate: mutateSecurities } = useSWR(
    issuerId ? `/api/securities?issuerId=${issuerId}` : null,
    swrFetcher,
    swrConfig
  );

  const { data: transferTransactionsData, isLoading: transfersLoading, mutate: mutateTransferTransactions } = useSWR(
    issuerId ? `/api/transfer-journal?issuerId=${issuerId}` : null,
    swrFetcher,
    swrConfig
  );

  // Use stable references to prevent infinite re-renders
  const securities = securitiesData || EMPTY_ARRAY;
  const transferTransactions = transferTransactionsData || EMPTY_ARRAY;

  // ⚡ OPTIMIZED: Prevent duplicate execution with ref guard
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (hasLoadedRef.current) return;
    if (!initialized || !user) return;

    const loadData = async () => {
      try {
        const params = await paramsPromise;
        const id = params.issuerId;

        // Prevent re-execution if we've already loaded this issuer
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        // Update issuerId state for UI rendering
        setIssuerId(id);

        if (!user) {
          router.push("/login");
          return;
        }

        // ⚡ OPTIMIZED: Just validate auth - SWR handles data fetching automatically
        const authResult = await validateAndSetIssuer(id);

        // Check access
        if (!authResult.hasAccess) {
          router.push("/?error=no_access");
          return;
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user]);

  // ⚡ Update data state when SWR data changes (instant from cache)
  useEffect(() => {
    // Guard: Only update data when issuer is validated and data is loaded
    if (!securitiesLoading && !transfersLoading && issuerId && currentIssuer) {
      // Use transfer transactions directly for control book display (flat array, not grouped)
      const controlBookData = transferTransactions;

      // Set default active tab to first CUSIP (only if not already set)
      if (controlBookData.length > 0 && !activeTab) {
        const uniqueCusips = [
          ...new Set(
            controlBookData.map((record) => record.cusip).filter(Boolean),
          ),
        ];
        if (uniqueCusips.length > 0) {
          setActiveTab(uniqueCusips[0]);
        }
      }

      setData({
        securities,
        controlBookData,
      });

      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securities, transferTransactions, securitiesLoading, transfersLoading, issuerId, currentIssuer]);

  // Apply filters whenever any filter criteria changes
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.controlBookData,
    searchTerm,
    activeTab,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
  ]);

  // ✅ fetchData removed - SWR handles all data fetching automatically now

  // OPTIMIZED: Create Map for O(1) security lookups instead of Array.find O(n)
  const securitiesMap = useMemo(() => {
    return new Map(data.securities.map(s => [s.cusip, s]));
  }, [data.securities]);

  const applyFilters = useCallback(() => {
    let filtered = [...data.controlBookData];

    // Filter by active tab (CUSIP)
    if (activeTab) {
      filtered = filtered.filter((entry) => entry.cusip === activeTab);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.cusip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.issue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.security_type?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Date filters
    if (dateFrom) {
      filtered = filtered.filter((entry) => {
        const entryDate = entry.transaction_date || (entry.created_at ? entry.created_at.split("T")[0] : null);
        return entryDate && entryDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter((entry) => {
        const entryDate = entry.transaction_date || (entry.created_at ? entry.created_at.split("T")[0] : null);
        return entryDate && entryDate <= dateTo;
      });
    }

    // Group by date AND transaction type separately
    const transactionGroups = {};

    // DEBUG: Log first 3 entries to see what we're processing
    console.log('🔍 Client Debug - First 3 filtered entries:');
    filtered.slice(0, 3).forEach((entry, i) => {
      console.log(`  ${i + 1}. transaction_type: "${entry.transaction_type}" | credit_debit: "${entry.credit_debit}" | qty: ${entry.share_quantity}`);
    });

    filtered.forEach((entry) => {
      const date = entry.transaction_date || (entry.created_at ? entry.created_at.split("T")[0] : '');
      const transactionType = entry.transaction_type;
      const groupKey = `${date}-${transactionType}`;

      if (!transactionGroups[groupKey]) {
        transactionGroups[groupKey] = {
          date: date,
          cusip: entry.cusip,
          transactionType: transactionType,
          totalShares: 0,
          entries: [],
          firstEntry: entry,
        };
      }

      // ✅ FIX: Use Math.abs because quantities might already be negative in DB
      const quantity = Math.abs(Number(entry.share_quantity) || 0);

      // ✅ FIX: Use same robust debit detection as outstandingByCusip
      let isDebit = false;
      if (entry.credit_debit) {
        const cdStr = String(entry.credit_debit).toLowerCase();
        isDebit = cdStr.includes('debit') || cdStr.includes('withdrawal');
      } else {
        isDebit = entry.transaction_type === "DWAC Withdrawal" ||
          entry.transaction_type === "Transfer Debit";
      }

      const netChange = isDebit ? -quantity : quantity;
      transactionGroups[groupKey].totalShares += netChange;
      transactionGroups[groupKey].entries.push(entry);
    });

    // Sort by date and transaction type, then calculate running totals
    const sortedGroups = Object.values(transactionGroups).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.transactionType.localeCompare(b.transactionType);
    });

    let runningTotal = 0;

    const aggregatedData = sortedGroups.map((group) => {
      runningTotal += group.totalShares;

      return {
        ...group.firstEntry,
        aggregatedDate: group.date,
        aggregatedNetShares: group.totalShares,
        runningTotal: runningTotal,
        transactionType: group.transactionType,
        entryCount: group.entries.length,
      };
    });

    // Apply final sorting
    aggregatedData.sort((a, b) => {
      let aValue = getSortValue(a, sortField);
      let bValue = getSortValue(b, sortField);

      // Handle numeric sorting
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Handle date sorting
      if (sortField === "transaction_date" || sortField === "created_at") {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }

      // Handle string sorting (case-insensitive)
      const aStr = String(aValue || "").toLowerCase();
      const bStr = String(bValue || "").toLowerCase();

      if (sortDirection === "asc") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    setFilteredData(aggregatedData);
    setCurrentPage(1);
  }, [data.controlBookData, activeTab, searchTerm, dateFrom, dateTo, sortField, sortDirection, securitiesMap]);

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortValue = useCallback((entry, field) => {
    // OPTIMIZED: Use Map for O(1) lookup instead of Array.find O(n)
    const activeSecurity = securitiesMap.get(activeTab);

    switch (field) {
      case "issue_name":
        return (
          activeSecurity?.issue_name ||
          (currentIssuer
            ? `${currentIssuer.display_name || currentIssuer.issuer_name}`.trim()
            : "Unknown Security")
        );
      case "issue_ticker":
        return activeSecurity?.issue_ticker || "";
      case "cusip":
        return entry.cusip || "";
      case "transaction_date":
      case "created_at":
        return entry.aggregatedDate;
      case "security_type":
        return activeSecurity?.class_name || "";
      case "issued_security":
        return entry.aggregatedNetShares || 0;
      case "type_of_issuance":
        return entry.transactionType || "";
      case "outstanding_shares":
        return entry.runningTotal || 0;
      case "authorized_shares":
        return activeSecurity?.total_authorized_shares || 0;
      default:
        return entry[field] || "";
    }
  }, [securitiesMap, activeTab, currentIssuer]);

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
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </TableHead>
  );

  // OPTIMIZED: Memoize pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    return { totalPages, startIndex, endIndex, currentData };
  }, [filteredData, currentPage, itemsPerPage]);

  const { totalPages, startIndex, endIndex, currentData } = paginationData;

  // OPTIMIZED: Memoize outstanding shares calculation (was recalculated on every render)
  const outstandingByCusip = useMemo(() => {
    const result = {};

    data.controlBookData.forEach((record) => {
      if (!result[record.cusip]) {
        result[record.cusip] = {
          cusip: record.cusip,
          totalOutstanding: 0,
          security: securitiesMap.get(record.cusip),
        };
      }

      // ✅ FIX: Use Math.abs because quantities might already be negative in DB
      const quantity = Math.abs(Number(record.share_quantity) || 0);

      // ✅ FIX: Use same debit detection as RK Book
      let isDebit = false;
      if (record.credit_debit) {
        const cdStr = String(record.credit_debit).toLowerCase();
        isDebit = cdStr.includes('debit') || cdStr.includes('withdrawal');
      } else {
        // Fallback if credit_debit is missing
        isDebit = record.transaction_type === "DWAC Withdrawal" ||
          record.transaction_type === "Transfer Debit";
      }

      const netChange = isDebit ? -quantity : quantity;
      result[record.cusip].totalOutstanding += netChange;
    });

    return result;
  }, [data.controlBookData, securitiesMap]);

  const exportToCSV = useCallback(() => {
    const headers = [
      "Issue Name",
      "Issue Ticker",
      "Issue CUSIP",
      "Transaction Date",
      "Security Type",
      "Issued Security (#)",
      "Type of Issuance",
      "Total Outstanding Shares (#)",
      "Total Authorized Shares (#)",
    ];

    const csvContent = [
      headers.join(","),
      ...currentData.map((entry) => {
        const typeOfIssuance = entry.transactionType;
        const issuedSecurity = entry.aggregatedNetShares || 0;
        // OPTIMIZED: Use Map for O(1) lookup instead of Array.find O(n)
        const activeSecurity = securitiesMap.get(activeTab);
        const fullIssueName =
          activeSecurity?.issue_name ||
          (currentIssuer
            ? `${currentIssuer.display_name || currentIssuer.issuer_name}`.trim()
            : "Unknown Security");

        return [
          fullIssueName,
          entry.issue_ticker || activeSecurity?.issue_ticker || "-",
          entry.cusip,
          toUSDate(entry.aggregatedDate),
          entry.security_type || activeSecurity?.class_name || "-",
          issuedSecurity,
          typeOfIssuance,
          entry.runningTotal || "0",
          activeSecurity?.total_authorized_shares || "-",
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `control-book-${activeTab || "all"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [currentData, activeTab, securitiesMap, currentIssuer]);

  // ⚡ PROGRESSIVE LOADING: Show UI immediately, only block if auth not initialized
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
    );
  }

  // Permission checks handled by AuthContext

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
                      Control Book
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      High-level summary ledger showing total outstanding shares
                      for each CUSIP
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
                    {canEdit() && (
                      <Button
                        variant="outline"
                        className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                        onClick={() => setShowAddSecurity(true)}
                      >
                        <Building className="mr-2 h-4 w-4" />
                        Add Security
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                      onClick={exportToCSV}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>

              {/* CUSIP Tabs */}
              <Card className="card-glass border-0 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Securities Control Book
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-primary/5 border border-primary/20">
                      {[
                        ...new Set(
                          data.controlBookData
                            .map((record) => record.cusip)
                            .filter(Boolean),
                        ),
                      ].map((cusip) => {
                        // OPTIMIZED: Use Map for O(1) lookup
                        const security = securitiesMap.get(cusip);
                        const securityType =
                          security?.class_name ||
                          security?.security_type ||
                          "Unknown";
                        return (
                          <TabsTrigger
                            key={cusip}
                            value={cusip}
                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                          >
                            {securityType} ({cusip || "N/A"})
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {/* Search & Date Filters */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Search</Label>
                        <Input
                          placeholder="Search records..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Date From</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Date To</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary hover:bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

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
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading summary...</p>
                      </div>
                    </div>
                  ) : (
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
                          {/* OPTIMIZED: Use memoized calculation instead of recalculating on every render */}
                          {Object.values(outstandingByCusip).map(
                            (item) => {
                              // ✅ FIX: Only show Total Authorized for Class A and Class B
                              const securityType = (item.security?.class_name || item.security?.security_type || "").toLowerCase();
                              const isClassAOrB = securityType.includes("class a") || securityType.includes("class b");
                              const displayAuthorized = isClassAOrB && item.security?.total_authorized_shares;

                              return (
                                <TableRow key={item.cusip}>
                                  <TableCell className="whitespace-nowrap">
                                    {item.cusip}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {item.security?.issue_name ||
                                      "Unknown Security"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {item.security?.class_name ||
                                      item.security?.security_type ||
                                      "-"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {item.totalOutstanding.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {displayAuthorized
                                      ? item.security.total_authorized_shares.toLocaleString()
                                      : "N/A"}
                                  </TableCell>

                                </TableRow>
                              );
                            },
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Control Book Table by CUSIP */}
              <Card className="card-glass border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Lock className="mr-2 h-5 w-5" />
                      Control Book -{" "}
                      {activeTab
                        ? (() => {
                          const security = data.securities.find(
                            (s) => s.cusip === activeTab,
                          );
                          return (
                            security?.class_name ||
                            security?.security_type ||
                            "Unknown Security"
                          );
                        })()
                        : "Select CUSIP"}
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-primary/5 text-primary border-primary/20"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Read Only
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Transfer journal records for CUSIP:{" "}
                    {activeTab || "None selected"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading control book data...</p>
                      </div>
                    </div>
                  ) : currentData.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <Database className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          No records found
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {activeTab
                            ? `No transactions found for CUSIP ${activeTab}`
                            : "Select a CUSIP tab to view records"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableHeader field="transaction_date">
                                Transaction Date
                              </SortableHeader>
                              <SortableHeader field="issue_name">
                                Issue Name
                              </SortableHeader>
                              <SortableHeader field="issue_ticker">
                                Issue Ticker
                              </SortableHeader>
                              <SortableHeader field="cusip">
                                Issue CUSIP
                              </SortableHeader>
                              <SortableHeader field="security_type">
                                Security Type
                              </SortableHeader>
                              <SortableHeader field="issued_security">
                                Issued Security (#)
                              </SortableHeader>
                              <SortableHeader field="type_of_issuance">
                                Type of Issuance
                              </SortableHeader>
                              <SortableHeader field="outstanding_shares">
                                Total Outstanding Shares (#)
                              </SortableHeader>
                              <SortableHeader field="authorized_shares">
                                Total Authorized Shares (#)
                              </SortableHeader>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {currentData.map((entry, index) => {
                              const activeSecurity = data.securities.find(
                                (s) => s.cusip === activeTab,
                              );
                              const fullIssueName =
                                activeSecurity?.issue_name ||
                                (currentIssuer
                                  ? `${currentIssuer.display_name || currentIssuer.issuer_name}`.trim()
                                  : "Unknown Security");

                              const typeOfIssuance = entry.transactionType;

                              return (
                                <TableRow
                                  key={`${entry.cusip}-${entry.aggregatedDate}-${entry.transactionType}-${index}`}
                                >
                                  <TableCell className=" whitespace-nowrap">
                                    {toUSDate(entry.aggregatedDate)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap ">
                                    {fullIssueName}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {activeSecurity?.issue_ticker || "-"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {entry.cusip}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {activeSecurity?.class_name || "-"}
                                  </TableCell>
                                  <TableCell
                                    className={`whitespace-nowrap font-medium ${entry.aggregatedNetShares >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                      }`}
                                  >
                                    {entry.aggregatedNetShares >= 0
                                      ? entry.aggregatedNetShares.toLocaleString()
                                      : `(${Math.abs(entry.aggregatedNetShares).toLocaleString()})`}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <Badge
                                      variant={
                                        typeOfIssuance === "IPO"
                                          ? "default"
                                          : typeOfIssuance === "DWAC Deposit"
                                            ? "default"
                                            : typeOfIssuance ===
                                              "DWAC Withdrawal"
                                              ? "secondary"
                                              : typeOfIssuance ===
                                                "Transfer Credit"
                                                ? "default"
                                                : typeOfIssuance ===
                                                  "Transfer Debit"
                                                  ? "secondary"
                                                  : "outline"
                                      }
                                    >
                                      {typeOfIssuance}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="  whitespace-nowrap">
                                    {entry.runningTotal.toLocaleString()}
                                  </TableCell>
                                  <TableCell className=" whitespace-nowrap">
                                    {(() => {
                                      // ✅ FIX: Only show Total Authorized for Class A and Class B
                                      const secType = (activeSecurity?.class_name || "").toLowerCase();
                                      const isClassAOrB = secType.includes("class a") || secType.includes("class b");
                                      return isClassAOrB && activeSecurity?.total_authorized_shares
                                        ? activeSecurity.total_authorized_shares.toLocaleString()
                                        : "N/A";
                                    })()}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-sm font-medium text-muted-foreground">
                            Showing <span className="text-foreground font-semibold">{startIndex + 1}</span> to{" "}
                            <span className="text-foreground font-semibold">{Math.min(endIndex, filteredData.length)}</span> of{" "}
                            <span className="text-foreground font-semibold">{filteredData.length}</span> results
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-border/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <div className="flex items-center space-x-1">
                              {Array.from(
                                { length: totalPages },
                                (_, i) => i + 1,
                              ).map((page) => (
                                <Button
                                  key={page}
                                  variant="outline"
                                  size="sm"
                                  className={`border transition-all ${currentPage === page
                                    ? "bg-wealth-gradient !text-black font-bold border-[#ffd900] shadow-lg scale-110"
                                    : "border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                                    }`}
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </Button>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-border/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
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
              <Input
                placeholder="Enter issue name"
              />
            </div>
            <div>
              <Label>Issue Ticker</Label>
              <Input
                placeholder="Enter ticker"
              />
            </div>
            <div>
              <Label>Trading Platform</Label>
              <Input
                placeholder="Enter platform"
              />
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
            <Button
              variant="outline"
              onClick={() => setShowAddSecurity(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowAddSecurity(false)}
            >
              Add Security
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
