"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTransactionProcessingData } from "@/hooks/use-transaction-processing";
import { useInvalidateIssuerData } from "@/hooks/use-issuer-data";
import { createClient } from "@/lib/supabase/client";
import { logAuditAction } from "@/lib/actions"; // Import server action
import { redirect } from "next/navigation";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRightLeft,
  ArrowRight,
  Plus,
  Building,
  User,
  FileText,
  CheckCircle,
  AlertTriangle,
  Zap,
  TrendingUp,
  Database,
  Shield,
  Eye,
  Settings,
  Calculator,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import SplitRatioManager from "@/components/SplitRatioManager";
import { toDBDate, toUSDate, getTodayDBDate } from "@/lib/dateUtils";
import { format, parseISO } from "date-fns";

export default function TransactionProcessingPage({ params: paramsPromise }) {
  const [issuerId, setIssuerId] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL parameters for broker request pre-population
  const brokerRequestId = searchParams.get('brokerRequestId');
  const urlTransactionType = searchParams.get('transactionType');
  const urlQuantity = searchParams.get('quantity');
  const urlNotes = searchParams.get('notes');

  // Use AuthContext instead of local state
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
    isIssuerSuspended,
    isIssuerPending,
    areTransactionsBlocked,
  } = useAuth();

  // Fetch fresh issuer data directly (bypassing AuthContext cache)
  const [freshIssuer, setFreshIssuer] = useState(null);

  useEffect(() => {
    if (issuerId) {
      fetch(`/api/issuers/${issuerId}`)
        .then(res => res.json())
        .then(data => {
          console.log(`🔍 Fresh Issuer Data: ${data.issuer_name}, split_security_type: "${data.split_security_type}"`);
          setFreshIssuer(data);
        })
        .catch(err => console.error('Failed to fetch fresh issuer:', err));
    }
  }, [issuerId]);

  // Use fresh issuer data if available, otherwise fallback to AuthContext
  const activeIssuer = freshIssuer || currentIssuer;

  // ⚡ TanStack Query - Parallel fetching with automatic caching
  const {
    securities,
    shareholders,
    splits,
    restrictionTemplates: fetchedRestrictionTemplates,
    splitRatios,
    securitiesLoading,
    shareholdersLoading,
    splitsLoading,
    isLoading: queryLoading,
    refetchAll,
  } = useTransactionProcessingData(issuerId);

  // ⚡ TanStack Query cache invalidation helpers
  const { invalidateAll, invalidateTransactions, invalidateShareholders, invalidateSecurities, invalidateRestrictions } = useInvalidateIssuerData();

  // ✅ Manual refresh function
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await refetchAll();
      toast.success("Data refreshed successfully");
      console.log("🔄 Data refreshed manually");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ NEW: Restriction templates state (lazy-loaded when needed)
  const [restrictionTemplates, setRestrictionTemplates] = useState([]);
  const [restrictionTemplatesLoaded, setRestrictionTemplatesLoaded] = useState(false);
  const [restrictionTemplatesLoading, setRestrictionTemplatesLoading] = useState(false);

  const dataLoading = queryLoading || !activeIssuer;

  // splitRatios now comes from useTransactionProcessingData hook (no duplicate useMemo needed)

  // Transaction form states
  const [transactionType, setTransactionType] = useState("");
  const [selectedSecurity, setSelectedSecurity] = useState("");
  const [selectedShareholder, setSelectedShareholder] = useState("");
  const [shareQuantity, setShareQuantity] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    getTodayDBDate(),
  );
  const [notes, setNotes] = useState("");

  // ✅ NEW: Restriction template selection (replaces old restriction states)
  const [selectedRestrictionTemplate, setSelectedRestrictionTemplate] = useState(null);

  // Processing states
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [classAShares, setClassAShares] = useState(0);
  const [rights, setRights] = useState(0);
  const [autoSplit, setAutoSplit] = useState(true); // Auto-calculate split shares

  // Split ratio configuration modal
  const [splitConfigOpen, setSplitConfigOpen] = useState(false);

  const getSecurityTypeLabel = () => {
    return activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants";
  };

  const transactionHints = {
    "Split": `Automatically splits Units into Class A shares and ${getSecurityTypeLabel()} - Creates 3 transactions in one step!`,
    "DWAC Deposit": `Expected Flow: Deposit Units → Receive Class A + ${getSecurityTypeLabel()}`,
    IPO: "Original issuance of new shares to shareholder",
    "Transfer Credit": "Credit shares to a shareholder",
    "Transfer Debit": "Debit shares from a shareholder",
  };

  const getTransactionHint = (type) => {
    if (type === "DWAC Withdrawal") {
      const ratios = splitRatios[type];
      if (ratios) {
        const classA = ratios.classA || 0;
        const rights = ratios.rights || 0;
        return `Expected Split: 1 Unit → ${classA} Class A, ${rights} Right`;
      }
      return "Expected Split: ratios not set in DB";
    }
    return transactionHints[type];
  };

  // Get params from promise
  useEffect(() => {
    const getParams = async () => {
      const params = await paramsPromise;
      setIssuerId(params.issuerId);
    };
    getParams();
  }, [paramsPromise]);

  // Validate issuer access and load data when issuerId changes
  useEffect(() => {
    if (issuerId && initialized && !authLoading) {
      validateIssuerAndLoadData();
    }
  }, [issuerId, initialized, authLoading]);

  const validateIssuerAndLoadData = async () => {
    if (!user) {
      redirect("/login");
      return;
    }

    // Validate access using AuthContext (force reload to get latest issuer data)
    const { hasAccess } = await validateAndSetIssuer(issuerId, true);

    if (!hasAccess) {
      redirect("/?error=no_access");
      return;
    }

    // ✅ Data loading now handled by SWR hooks - no manual fetch needed
  };

  // Helper to check if Cede is selected
  const isCedeSelected = (() => {
    const selected = shareholders.find((s) => s.id === selectedShareholder);
    return selected && selected.first_name?.toLowerCase().includes("cede");
  })();

  // Clear selected security when switching to Split (to prevent non-Units selection)
  useEffect(() => {
    if (transactionType === "Split" && selectedSecurity) {
      const security = securities.find(s => s.id === selectedSecurity);
      // If current selected security is not Units, clear it
      if (security && !security.class_name?.toLowerCase().includes("unit")) {
        setSelectedSecurity("");
      }
    }
  }, [transactionType, selectedSecurity, securities]);

  // Pre-populate form from URL parameters (broker request approval flow)
  useEffect(() => {
    if (!securities.length || !urlTransactionType) return;

    // Only run once when securities are loaded and we have URL params
    if (transactionType) return; // Already set, don't override

    console.log('🔔 [BROKER-REQUEST] Pre-populating form from URL parameters');
    console.log('   Transaction Type:', urlTransactionType);
    console.log('   Quantity:', urlQuantity);
    console.log('   Notes:', urlNotes);

    // Set transaction type
    setTransactionType(urlTransactionType);

    // Set quantity
    if (urlQuantity) {
      setShareQuantity(urlQuantity);
    }

    // Set notes
    if (urlNotes) {
      setNotes(urlNotes);
    }

    // For Split transactions, auto-select the Units security
    if (urlTransactionType === 'Split') {
      const unitsSecurity = securities.find(s =>
        s.class_name?.toLowerCase().includes('unit')
      );
      if (unitsSecurity) {
        console.log('   Auto-selecting Units security:', unitsSecurity.id);
        setSelectedSecurity(unitsSecurity.id);
      }
    }

    // Show toast notification
    if (brokerRequestId) {
      toast.info('Form pre-filled with broker request details. Please select a shareholder and review before processing.', {
        duration: 5000,
      });
    }
  }, [securities, urlTransactionType, urlQuantity, urlNotes, brokerRequestId]);

  // Auto-calculate split shares for DWAC Withdrawal or Split
  useEffect(() => {
    if (
      (transactionType === "DWAC Withdrawal" && isCedeSelected) ||
      (transactionType === "Split" && shareQuantity)
    ) {
      const qty = parseFloat(shareQuantity);

      // For Split, use DWAC Withdrawal ratios if available, otherwise default 1:1
      const ratios = splitRatios["DWAC Withdrawal"] || { classA: 1, rights: 1 };

      if (ratios.classA !== undefined) {
        setClassAShares(Math.floor(qty * ratios.classA));
      }
      if (ratios.rights !== undefined) {
        setRights(Math.floor(qty * ratios.rights));
      }
    }
  }, [
    shareQuantity,
    transactionType,
    selectedShareholder,
    shareholders,
    splitRatios,
  ]);

  // ✅ NEW: Fetch restriction templates when credit transaction type is selected
  useEffect(() => {
    const isCredit =
      transactionType === "IPO" ||
      transactionType === "DWAC Deposit" ||
      transactionType === "Transfer Credit";

    if (isCredit && issuerId && !restrictionTemplatesLoaded) {
      fetchRestrictionTemplatesIfNeeded();
    }
  }, [transactionType, issuerId]);

  // ✅ NEW: Lazy load restriction templates only when needed
  const fetchRestrictionTemplatesIfNeeded = async () => {
    if (restrictionTemplatesLoaded || restrictionTemplatesLoading) {
      return; // Already loaded or currently loading
    }

    setRestrictionTemplatesLoading(true);
    try {
      const response = await fetch(`/api/restriction-templates?issuerId=${issuerId}`);
      const data = await response.json();
      const activeTemplates = (data || []).filter(t => t.is_active);
      setRestrictionTemplates(activeTemplates);
      setRestrictionTemplatesLoaded(true);
      console.log(`✅ Loaded ${activeTemplates.length} active restriction templates`);
    } catch (error) {
      console.error("Error fetching restriction templates:", error);
      setRestrictionTemplates([]);
      setRestrictionTemplatesLoaded(true);
    } finally {
      setRestrictionTemplatesLoading(false);
    }
  };

  const validateTransaction = async () => {
    if (!transactionType) {
      toast.error("Please select a transaction type");
      return false;
    }
    if (!selectedSecurity) {
      toast.error("Please select a security");
      return false;
    }
    if (!selectedShareholder) {
      toast.error("Please select a shareholder");
      return false;
    }
    if (!shareQuantity || shareQuantity <= 0) {
      toast.error("Please enter a valid share quantity");
      return false;
    }
    if (!transactionDate) {
      toast.error("Please select a transaction date");
      return false;
    }

    // ⚡ OPTIMIZED: Fetch restriction templates only when validating (lazy load)
    await fetchRestrictionTemplatesIfNeeded();

    return true;
  };

  const previewTransaction = async () => {
    // ⚡ UPDATED: Now async to support lazy-loading restriction templates
    if (!(await validateTransaction())) return;

    const security = securities.find((s) => s.id === selectedSecurity);
    const shareholder = shareholders.find((s) => s.id === selectedShareholder);

    // Additional validation for Split transactions
    if (transactionType === "Split") {
      const securityName = security?.class_name?.toLowerCase() || '';
      if (!securityName.includes('unit')) {
        toast.error("Split transaction requires Units to be selected. Please select the Units security.");
        return;
      }
    }

    const isCredit =
      transactionType === "IPO" ||
      transactionType === "DWAC Deposit" ||
      transactionType === "Transfer Credit" ||
      transactionType === "Split"; // Split has both credit and debit

    // Calculate previous balance and outcome balance
    let previousBalance = 0;
    let outcomeBalance = 0;
    let splitBalances = null;

    try {
      const supabase = createClient();

      if (transactionType === "Split") {
        // For Split transactions, calculate balances for all 3 securities
        // 1. Try to find explicit Class A
        let classASecurity = securities.find(s =>
          s.class_name?.toLowerCase().includes("class a") &&
          s.issuer_id === issuerId
        );

        // 2. Fallback: Try Common Stock or Ordinary Shares if Class A not found
        if (!classASecurity) {
          classASecurity = securities.find(s =>
            (s.class_name?.toLowerCase().includes("common stock") ||
              s.class_name?.toLowerCase().includes("ordinary shares")) &&
            s.issuer_id === issuerId
          );
        }

        // Determine preferred type from issuer config (default to Warrant if not set)
        const preferredType = activeIssuer?.split_security_type || "Warrant";
        const isRight = preferredType === "Right";

        // Find the security based on preference, but allow fallback
        const warrantSecurity = securities.find(s => {
          const name = s.class_name?.toLowerCase() || "";
          // If preference is Right, look for Right first
          if (isRight) return name.includes("right");
          // If preference is Warrant, look for Warrant first
          return name.includes("warrant");
        }) || securities.find(s => {
          // Fallback: look for the other one if preferred not found
          const name = s.class_name?.toLowerCase() || "";
          if (isRight) return name.includes("warrant");
          return name.includes("right");
        });

        const getBalanceFromPositions = async (securityId) => {
          if (!securityId) return 0;

          // Query shareholder_positions_new (single source of truth)
          const { data: position, error } = await supabase
            .from("shareholder_positions_new")
            .select("shares_owned")
            .eq("issuer_id", issuerId)
            .eq("shareholder_id", shareholder.id)
            .eq("security_id", securityId)
            .lte("position_date", transactionDate)
            .order("position_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(`Error fetching position for security ${securityId}:`, error);
            return 0;
          }

          return position?.shares_owned || 0;
        };

        const unitsPrevious = await getBalanceFromPositions(security.id);
        const classAPrevious = classASecurity ? await getBalanceFromPositions(classASecurity.id) : 0;
        const warrantsPrevious = warrantSecurity ? await getBalanceFromPositions(warrantSecurity.id) : 0;

        console.log(`Split balance preview from positions:`, {
          units: unitsPrevious,
          classA: classAPrevious,
          warrants: warrantsPrevious
        });

        splitBalances = {
          units: {
            previous: unitsPrevious,
            outcome: unitsPrevious - Math.floor(parseFloat(shareQuantity)),
          },
          classA: {
            previous: classAPrevious,
            outcome: classAPrevious + classAShares,
          },
          warrants: {
            previous: warrantsPrevious,
            outcome: warrantsPrevious + rights,
            label: isRight ? "Rights" : "Warrants" // Pass label for UI
          },
        };
      } else {
        // Regular transaction balance calculation - Query from shareholder_positions_new (single source of truth)
        const { data: position, error: positionError } = await supabase
          .from("shareholder_positions_new")
          .select("shares_owned")
          .eq("issuer_id", issuerId)
          .eq("shareholder_id", shareholder.id)
          .eq("security_id", security.id)
          .lte("position_date", transactionDate)
          .order("position_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("Balance calculation for preview from positions:", {
          shareholder: shareholder.id,
          security: security.id,
          position: position,
        });

        if (positionError) {
          console.error("Error fetching position for balance:", positionError);
          toast.error("Failed to fetch current balance. Please try again.");
          return;
        }

        // Get current balance from position table
        previousBalance = position?.shares_owned || 0;

        // Calculate outcome balance
        const currentQty = Math.floor(parseFloat(shareQuantity));
        const currentIsDebit = transactionType === 'DWAC Withdrawal' || transactionType === 'Transfer Debit';
        outcomeBalance = previousBalance + (currentIsDebit ? -currentQty : currentQty);
      }
    } catch (error) {
      console.error("Error calculating balances:", error);
    }

    const preferredType = activeIssuer?.split_security_type || "Warrant";
    const secondSecurityLabel = preferredType === "Right" ? "Rights" : "Warrants";

    // For Split transactions, gather all securities involved
    let allSecurities = null;
    if (transactionType === "Split") {
      // Find Class A security
      let classASecurity = securities.find(s =>
        s.class_name?.toLowerCase().includes("class a") &&
        s.issuer_id === issuerId
      );
      if (!classASecurity) {
        classASecurity = securities.find(s =>
          (s.class_name?.toLowerCase().includes("common stock") ||
            s.class_name?.toLowerCase().includes("ordinary shares")) &&
          s.issuer_id === issuerId
        );
      }

      // Find Warrant/Right security
      const isRight = preferredType === "Right";
      const warrantSecurity = securities.find(s => {
        const name = s.class_name?.toLowerCase() || "";
        if (isRight) return name.includes("right");
        return name.includes("warrant");
      }) || securities.find(s => {
        const name = s.class_name?.toLowerCase() || "";
        if (isRight) return name.includes("warrant");
        return name.includes("right");
      });

      allSecurities = {
        units: security,
        classA: classASecurity,
        warrant: warrantSecurity
      };
    }

    setPreviewData({
      transaction_type: transactionType,
      display_transaction_type:
        transactionType === "IPO" ? "Original Issuance" :
          transactionType === "Split" ? `Split (Units → Class A + ${secondSecurityLabel})` :
            transactionType,
      security: security,
      all_securities: allSecurities,
      shareholder: shareholder,
      share_quantity: Math.floor(parseFloat(shareQuantity)),
      class_a: classAShares,
      rights: rights,
      transaction_date: transactionDate,
      credit_debit: isCredit ? "Credit" : "Debit",
      notes: notes,
      previous_balance: previousBalance,
      outcome_balance: outcomeBalance,
      split_balances: splitBalances,
      restriction_id: selectedRestrictionTemplate, // ✅ ADD restriction
      restriction_template: restrictionTemplates.find(t => t.id === selectedRestrictionTemplate), // ✅ ADD template details
    });
  };

  const processTransaction = async () => {
    if (!previewData) return;

    // ✅ VALIDATION: Check if transactions are blocked (suspended or pending)
    if (areTransactionsBlocked()) {
      const message = isIssuerPending()
        ? "This issuer is in onboarding mode - transactions are disabled until the issuer goes live"
        : "This issuer is suspended - transactions are not allowed in read-only mode";
      toast.error(message, { duration: 5000 });
      return;
    }

    // ✅ VALIDATION: Check if shareholder still exists (prevent stale cache issue)
    const shareholderExists = shareholders.find(s => s.id === previewData.shareholder.id);
    if (!shareholderExists) {
      toast.error(
        "Shareholder data is stale. Please refresh the page (Ctrl+R / Cmd+R) and try again.",
        { duration: 8000 }
      );
      return;
    }

    // ✅ VALIDATION: Prevent negative balance transactions
    if (previewData.transaction_type === "Split") {
      // For split transactions, check if Units balance would go negative
      if (previewData.split_balances?.units.outcome < 0) {
        toast.error(
          `Insufficient Units balance. Shareholder has ${previewData.split_balances.units.previous.toLocaleString()} Units but transaction requires ${previewData.share_quantity.toLocaleString()} Units. Please credit Units first (via IPO, DWAC Deposit, or Transfer Credit).`,
          { duration: 6000 }
        );
        return;
      }
    } else {
      // For regular transactions, check if outcome balance would be negative
      if (previewData.outcome_balance < 0) {
        const transactionTypeLabel = previewData.transaction_type === 'DWAC Withdrawal' || previewData.transaction_type === 'Transfer Debit'
          ? 'debit'
          : 'transaction';
        toast.error(
          `Insufficient balance. Shareholder has ${previewData.previous_balance.toLocaleString()} shares but this ${transactionTypeLabel} requires ${previewData.share_quantity.toLocaleString()} shares. Please credit shares first.`,
          { duration: 6000 }
        );
        return;
      }
    }

    try {
      setProcessing(true);

      const supabase = createClient();

      // Handle Split transaction differently - create 3 transactions
      if (previewData.transaction_type === "Split") {
        console.log("🔄 Processing Split transaction - will create 3 transactions");

        // Validate that selected security is Units
        const selectedSecurityName = previewData.security.class_name?.toLowerCase() || '';
        if (!selectedSecurityName.includes('unit')) {
          const splitType = activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants";
          throw new Error(`Split transaction requires Units to be selected as the security. Please select the Units security, not Class A or ${splitType}.`);
        }

        // Find the securities for Class A and Rights/Warrants
        const unitsecurity = previewData.security;

        // 1. Try to find explicit Class A
        let classASecurity = securities.find(s =>
          s.class_name?.toLowerCase().includes("class a") &&
          s.issuer_id === issuerId
        );

        // 2. Fallback: Try Common Stock or Ordinary Shares if Class A not found
        if (!classASecurity) {
          classASecurity = securities.find(s =>
            (s.class_name?.toLowerCase().includes("common stock") ||
              s.class_name?.toLowerCase().includes("ordinary shares")) &&
            s.issuer_id === issuerId
          );
        }

        const warrantSecurity = securities.find(s =>
          (s.class_name?.toLowerCase().includes("warrant") ||
            s.class_name?.toLowerCase().includes("right")) &&
          s.issuer_id === issuerId
        );

        if (!classASecurity) {
          throw new Error("Class A security not found. Please create a Class A security first.");
        }
        if (!warrantSecurity) {
          throw new Error("Warrant/Right security not found. Please create a Warrant/Right security first.");
        }

        // Transaction 1: Debit Units from shareholder
        // IMPORTANT: Store as NEGATIVE to match how imports work (withdrawals = negative)
        const debitUnitsData = {
          issuer_id: issuerId,
          cusip: unitsecurity.cusip || "N/A",
          transaction_type: "DWAC Withdrawal",
          shareholder_id: previewData.shareholder.id,
          share_quantity: -Math.abs(Math.floor(previewData.share_quantity)),  // Store as NEGATIVE for debits
          transaction_date: previewData.transaction_date,
          status: "Active",
          certificate_type: "Book Entry",
          notes: `Split transaction - Debit Units${previewData.notes ? ` | ${previewData.notes}` : ""}`,
        };

        // Transaction 2: Credit Class A shares to shareholder
        const creditClassAData = {
          issuer_id: issuerId,
          cusip: classASecurity.cusip || "N/A",
          transaction_type: "DWAC Deposit",
          shareholder_id: previewData.shareholder.id,
          share_quantity: Math.floor(previewData.class_a),
          transaction_date: previewData.transaction_date,
          status: "Active",
          certificate_type: "Book Entry",
          notes: `Split transaction - Credit Class A${previewData.notes ? ` | ${previewData.notes}` : ""}`,
        };

        // Transaction 3: Credit Warrants/Rights to shareholder
        const securityTypeLabel = activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants";
        const creditWarrantsData = {
          issuer_id: issuerId,
          cusip: warrantSecurity.cusip || "N/A",
          transaction_type: "DWAC Deposit",
          shareholder_id: previewData.shareholder.id,
          share_quantity: Math.floor(previewData.rights),
          transaction_date: previewData.transaction_date,
          status: "Active",
          certificate_type: "Book Entry",
          notes: `Split transaction - Credit ${securityTypeLabel}${previewData.notes ? ` | ${previewData.notes}` : ""}`,
        };

        console.log("📝 Split transactions to insert:", {
          debitUnits: debitUnitsData,
          creditClassA: creditClassAData,
          creditWarrants: creditWarrantsData,
        });

        // Insert all 3 transactions
        const { data: splitResults, error: splitError } = await supabase
          .from("transfers_new")
          .insert([debitUnitsData, creditClassAData, creditWarrantsData])
          .select();

        console.log("🔍 Split insert result:", { data: splitResults, error: splitError });

        if (splitError) {
          console.error("🚨 Split transaction error:", splitError);
          throw new Error(
            `Failed to create split transactions: ${splitError.message || JSON.stringify(splitError)}`,
          );
        }

        // Log Audit for Split Transaction
        await logAuditAction({
          action: "CREATE_TRANSACTION",
          entityType: "transaction",
          entityId: `split-${Date.now()}`, // Placeholder ID for group
          issuerId: issuerId,
          userId: user.id,
          details: {
            type: "Split",
            original_shareholder: previewData.shareholder.id,
            debit_units: debitUnitsData.share_quantity,
            credit_class_a: creditClassAData.share_quantity,
            credit_warrants: creditWarrantsData.share_quantity
          }
        });

        // Update shareholder positions for all 3 securities affected by split
        try {
          console.log("📊 Updating shareholder positions for split transactions...");

          // Helper function to update position for a security
          const updatePositionForSecurity = async (cusip, securityName) => {
            const startTime = Date.now();
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔍 [POSITION UPDATE START] ${securityName} (${cusip})`);
            console.log(`   Timestamp: ${new Date().toISOString()}`);
            console.log(`   Issuer ID: ${issuerId}`);
            console.log(`   Shareholder ID: ${previewData.shareholder.id}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
              // STEP 1: Get security_id from CUSIP
              console.log(`📍 STEP 1: Looking up security by CUSIP...`);
              console.log(`   CUSIP: ${cusip}`);
              console.log(`   Issuer ID: ${issuerId}`);

              const { data: securityData, error: securityError } = await supabase
                .from("securities_new")
                .select("id")
                .eq("cusip", cusip)
                .eq("issuer_id", issuerId)
                .single();

              if (securityError) {
                console.error(`❌ [${securityName}] STEP 1 FAILED: Could not find security`);
                console.error(`   Error Code: ${securityError.code}`);
                console.error(`   Error Message: ${securityError.message}`);
                console.error(`   Error Details:`, securityError.details);
                console.error(`   CUSIP searched: ${cusip}`);
                console.error(`   Issuer ID searched: ${issuerId}`);
                console.error(`   ⚠️ POSITION UPDATE ABORTED - Security not found`);
                return;
              }

              console.log(`✅ STEP 1 SUCCESS: Security found`);
              console.log(`   Security ID: ${securityData.id}`);
              console.log(`   CUSIP: ${cusip}`);


              // STEP 2: Calculate total shares for this shareholder + security up to this date
              const queryDate = previewData.transaction_date.split('T')[0];

              console.log(`\n📍 STEP 2: Fetching all transactions for position calculation...`);
              console.log(`   Query Date: ${queryDate}`);
              console.log(`   Shareholder ID: ${previewData.shareholder.id}`);
              console.log(`   CUSIP: ${cusip}`);
              console.log(`   Issuer ID: ${issuerId}`);

              const { data: allTransactions, error: transactionsError, status: queryStatus } = await supabase
                .from("transfers_new")
                .select("share_quantity, transaction_type, status")
                .eq("issuer_id", issuerId)
                .eq("shareholder_id", previewData.shareholder.id)
                .eq("cusip", cusip)
                .lte("transaction_date", queryDate);

              console.log(`📊 STEP 2 Query Result:`);
              console.log(`   Transactions Found: ${allTransactions?.length || 0}`);
              console.log(`   Has Error: ${!!transactionsError}`);
              console.log(`   Query Status: ${queryStatus}`);

              if (transactionsError) {
                console.error(`❌ [${securityName}] STEP 2 FAILED: Error fetching transactions`);
                console.error(`   Error Code: ${transactionsError.code}`);
                console.error(`   Error Message: ${transactionsError.message}`);
                console.error(`   Error Details:`, transactionsError.details);
                console.error(`   Error Hint: ${transactionsError.hint}`);
                console.error(`   CUSIP: ${cusip}`);
                console.error(`   Is RLS Issue: ${transactionsError.code === '42501' || transactionsError.message?.includes('policy')}`);
                console.error(`   ⚠️ POSITION UPDATE ABORTED - Transaction fetch failed`);
                return;
              }

              console.log(`✅ STEP 2 SUCCESS: Transactions fetched`);
              if (allTransactions && allTransactions.length > 0) {
                // Log first few and summary
                console.log(`   Sample transactions (first 5):`, allTransactions.slice(0, 5));
                // Log any weird ones
                const weirdTx = allTransactions.filter(t => t.share_quantity > 10000000);
                if (weirdTx.length) console.log("   ⚠️ FOUND HUGE TRANSACTIONS (>10M):", weirdTx);
              }

              // STEP 3: Calculate total shares owned
              console.log(`\n📍 STEP 3: Calculating total shares owned...`);

              const activeTransactions = (allTransactions || []).filter(tx => {
                const status = String(tx.status || '').toUpperCase(); // Fix: Case insensitive
                return status === 'ACTIVE';
              });

              console.log(`   Total Transactions: ${allTransactions?.length || 0}`);
              console.log(`   Active Transactions: ${activeTransactions.length}`);

              // FIX: The share_quantity in transfers_new is already stored with correct sign:
              // - Credits (IPO, DWAC Deposit, etc.): POSITIVE values
              // - Debits (DWAC Withdrawal, Transfer Debit, etc.): NEGATIVE values
              // So we just sum them directly without conditional negation.
              // The previous code was DOUBLE-NEGATING debits, causing massive position errors.
              const totalShares = activeTransactions.reduce((sum, tx) => {
                const qty = Number(tx.share_quantity) || 0;
                const type = (tx.transaction_type || '').trim();

                // Debug log to verify correct calculation
                console.log(`      [TX] ${type}: ${qty >= 0 ? '+' : ''}${qty} | Running Sum: ${sum + qty}`);

                return sum + qty;  // Simply add - sign is already correct in DB
              }, 0);

              console.log(`✅ STEP 3 SUCCESS: Total shares calculated`);
              console.log(`   Total Shares Owned: ${totalShares.toLocaleString()}`);
              console.log(`   Shareholder ID: ${previewData.shareholder.id}`);
              console.log(`   Security ID: ${securityData.id}`);

              // STEP 4: Upsert shareholder position
              const positionData = {
                issuer_id: issuerId,
                shareholder_id: previewData.shareholder.id,
                security_id: securityData.id,
                shares_owned: totalShares,
                position_date: queryDate,
                updated_at: new Date().toISOString(),
              };

              console.log(`\n📍 STEP 4: Upserting position to database...`);
              console.log(`   Position Data:`, JSON.stringify(positionData, null, 2));

              const { data: upsertResult, error: positionError } = await supabase
                .from("shareholder_positions_new")
                .upsert(positionData, {
                  onConflict: "issuer_id,shareholder_id,security_id,position_date",
                })
                .select();

              if (positionError) {
                console.error(`❌ [${securityName}] STEP 4 FAILED: Position upsert error`);
                console.error(`   Error Code: ${positionError.code}`);
                console.error(`   Error Message: ${positionError.message}`);
                console.error(`   Error Details:`, positionError.details);
                console.error(`   Error Hint: ${positionError.hint}`);
                console.error(`   Position Data:`, positionData);
                console.error(`   ⚠️ POSITION UPDATE FAILED - Database upsert error`);
              } else {
                const duration = Date.now() - startTime;
                console.log(`✅ STEP 4 SUCCESS: Position upserted successfully`);
                console.log(`   Upsert Result:`, upsertResult);
                console.log(`   Duration: ${duration}ms`);
                console.log(`\n${'='.repeat(60)}`);
                console.log(`✅ [POSITION UPDATE COMPLETE] ${securityName} - SUCCESS`);
                console.log(`   Final Balance: ${totalShares.toLocaleString()}`);
                console.log(`   Total Duration: ${duration}ms`);
                console.log(`${'='.repeat(60)}\n`);
              }
            } catch (error) {
              const duration = Date.now() - startTime;
              console.error(`\n${'='.repeat(60)}`);
              console.error(`❌ [POSITION UPDATE FAILED] ${securityName} - EXCEPTION THROWN`);
              console.error(`   Error Type: ${error.constructor.name}`);
              console.error(`   Error Message: ${error.message}`);
              console.error(`   Error Stack:`, error.stack);
              console.error(`   Duration before failure: ${duration}ms`);
              console.error(`${'='.repeat(60)}\n`);
              throw error; // Re-throw to be caught by outer catch
            }
          };

          // Update positions for all 3 securities
          const splitSecurityLabel = activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants";
          await Promise.all([
            updatePositionForSecurity(unitsecurity.cusip, "Units"),
            updatePositionForSecurity(classASecurity.cusip, "Class A"),
            updatePositionForSecurity(warrantSecurity.cusip, splitSecurityLabel),
          ]);

        } catch (positionUpdateError) {
          console.error("⚠️ Position update error:", positionUpdateError);
          toast.warning("Split processed but position update may need manual refresh");
        }

        // ⚡ Invalidate TanStack Query caches for Split transactions
        invalidateAll(issuerId);
        console.log('✅ Invalidated TanStack Query cache after Split transaction');

        // 🔔 Notify broker if this was a broker request
        if (brokerRequestId) {
          console.log('🔔 [BROKER-NOTIFY] Notifying broker of completed transaction');
          try {
            // Update the request status to Completed
            await supabase
              .from('transfer_agent_requests')
              .update({
                status: 'Completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', brokerRequestId);

            // Fetch broker request details
            const { data: brokerRequest } = await supabase
              .from('transfer_agent_requests')
              .select('*')
              .eq('id', brokerRequestId)
              .single();

            // Fetch broker info from users_new table
            let brokerInfo = null;
            if (brokerRequest?.broker_id) {
              const { data: brokerData } = await supabase
                .from('users_new')
                .select('id, name, email')
                .eq('id', brokerRequest.broker_id)
                .single();
              brokerInfo = brokerData;
            }

            if (brokerRequest && brokerInfo) {
              // Send notification to broker
              const transactionTime = new Date().toLocaleString('en-US', {
                dateStyle: 'long',
                timeStyle: 'short'
              });

              console.log('🔔 [BROKER-NOTIFY] Broker info:', brokerInfo);

              // Create in-app notification
              await supabase
                .from('notifications')
                .insert({
                  user_id: brokerInfo.id,
                  type: 'split_request_completed',
                  title: `Split Request #${brokerRequest.request_number} Completed`,
                  message: `Your split request has been processed. ${previewData.share_quantity.toLocaleString()} Units → ${classAShares.toLocaleString()} Class A + ${rights.toLocaleString()} ${activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"}. Processed by ${user?.email} at ${transactionTime}.`,
                  entity_type: 'transfer_request',
                  entity_id: brokerRequestId,
                  action_url: `/information/${issuerId}`
                });

              // Send email notification to broker
              const { sendEmail } = await import('@/lib/email/resend-client');
              await sendEmail({
                to: brokerInfo.email,
                subject: `Split Request #${brokerRequest.request_number} - Transaction Completed`,
                text: `Your Broker Split Request #${brokerRequest.request_number} has been completed!

TRANSACTION DETAILS:
- Units Debited: ${previewData.share_quantity.toLocaleString()}
- Class A Credited: ${classAShares.toLocaleString()}
- ${activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"} Credited: ${rights.toLocaleString()}

Processed by: ${user?.user_metadata?.name || user?.email}
Transaction Time: ${transactionTime}

This is an automated notification from Efficiency Transfer Agent.`
              });

              console.log('🔔 [BROKER-NOTIFY] ✅ Broker notified successfully');
            } else {
              console.warn('🔔 [BROKER-NOTIFY] ⚠️ Could not notify broker - missing data:', {
                hasBrokerRequest: !!brokerRequest,
                hasBrokerInfo: !!brokerInfo,
                brokerId: brokerRequest?.broker_id
              });
            }
          } catch (notifyError) {
            console.error('🔔 [BROKER-NOTIFY] ❌ Failed to notify broker:', notifyError);
            // Don't fail the transaction if notification fails
          }
        }

        toast.success(`Split transaction processed successfully! Created 3 transactions.`, {
          action: {
            label: "View Record Book",
            onClick: () => window.location.href = `/issuer/${issuerId}/record-keeping?refresh=true`,
          },
          duration: 5000,
        });

      } else {
        // Regular single transaction processing
        // Determine if this is a debit (withdrawal) - store as negative to match import convention
        const isDebitTransaction = previewData.transaction_type === 'DWAC Withdrawal' ||
          previewData.transaction_type === 'Transfer Debit';
        const quantity = Math.floor(previewData.share_quantity);

        const transactionData = {
          issuer_id: issuerId,
          cusip: previewData.security.cusip || "N/A",
          transaction_type: previewData.transaction_type,
          shareholder_id: previewData.shareholder.id,
          share_quantity: isDebitTransaction ? -Math.abs(quantity) : Math.abs(quantity),  // Debits = negative, Credits = positive
          transaction_date: previewData.transaction_date,
          status: "Active",
          certificate_type: "Book Entry",
          notes: previewData.notes || null,
          restriction_id: selectedRestrictionTemplate || null, // ✅ ADD RESTRICTION_ID
        };

        console.log("📝 Transaction data to insert:", transactionData);

        const { data: transactionResult, error } = await supabase
          .from("transfers_new")
          .insert([transactionData])
          .select();

        console.log("🔍 Insert result:", { data: transactionResult, error });

        if (error) {
          console.error("🚨 Database error details:", error);

          // Check for foreign key constraint violation (stale cache issue)
          if (error.code === '23503' && error.message?.includes('shareholder_id')) {
            throw new Error(
              `Shareholder data is stale. Please refresh the page (Ctrl+R / Cmd+R) and try again. This can happen after importing data.`
            );
          }

          throw new Error(
            `Database error: ${error.message || JSON.stringify(error)}`,
          );
        }

        // Log Audit for Regular Transaction
        await logAuditAction({
          action: "CREATE_TRANSACTION",
          entityType: "transaction",
          entityId: transactionResult?.[0]?.id || "unknown",
          issuerId: issuerId,
          userId: user.id,
          details: {
            transaction_type: transactionData.transaction_type,
            quantity: transactionData.share_quantity,
            cusip: transactionData.cusip,
            shareholder_id: transactionData.shareholder_id
          }
        });

        // ✅ Restriction is already saved in transfers_new.restriction_id
        // No need to duplicate - statement generation reads from there
        if (selectedRestrictionTemplate) {
          console.log("✅ Restriction applied to transaction:", selectedRestrictionTemplate);
        }
      }

      // ✅ UPDATE SHAREHOLDER POSITIONS: Calculate and update current position
      // Skip position update for Split transactions as they create multiple securities
      if (previewData.transaction_type !== "Split") {
        const positionStartTime = Date.now();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 [REGULAR TRANSACTION POSITION UPDATE START]`);
        console.log(`   Transaction Type: ${previewData.transaction_type}`);
        console.log(`   Security: ${previewData.security.class_name} (${previewData.security.cusip})`);
        console.log(`   Shareholder: ${previewData.shareholder.first_name} ${previewData.shareholder.last_name}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        console.log(`${'='.repeat(80)}\n`);

        try {
          // STEP 1: Get security_id from CUSIP
          console.log(`📍 STEP 1: Looking up security by CUSIP...`);
          console.log(`   CUSIP: ${previewData.security.cusip}`);
          console.log(`   Issuer ID: ${issuerId}`);

          const { data: securityData, error: securityError } = await supabase
            .from("securities_new")
            .select("id")
            .eq("cusip", previewData.security.cusip)
            .eq("issuer_id", issuerId)
            .single();

          if (securityError) {
            console.error(`❌ STEP 1 FAILED: Could not find security`);
            console.error(`   Error Code: ${securityError.code}`);
            console.error(`   Error Message: ${securityError.message}`);
            console.error(`   Error Details:`, securityError.details);
            console.error(`   CUSIP searched: ${previewData.security.cusip}`);
            throw new Error("Could not find security for position update");
          }

          console.log(`✅ STEP 1 SUCCESS: Security found`);
          console.log(`   Security ID: ${securityData.id}`);

          // STEP 2: Calculate total shares for this shareholder + security up to this date
          const queryDate = previewData.transaction_date.split('T')[0];

          console.log(`\n📍 STEP 2: Fetching all transactions for position calculation...`);
          console.log(`   Query Date: ${queryDate}`);
          console.log(`   Query Date Type: ${typeof queryDate}`);
          console.log(`   Issuer ID: ${issuerId}`);
          console.log(`   Shareholder ID: ${previewData.shareholder.id}`);
          console.log(`   CUSIP: ${previewData.security.cusip}`);

          const { data: allTransactions, error: transactionsError, status: queryStatus } = await supabase
            .from("transfers_new")
            .select("share_quantity, transaction_type, status")
            .eq("issuer_id", issuerId)
            .eq("shareholder_id", previewData.shareholder.id)
            .eq("cusip", previewData.security.cusip)
            .lte("transaction_date", queryDate);

          console.log(`📊 STEP 2 Query Result:`);
          console.log(`   Transactions Found: ${allTransactions?.length || 0}`);
          console.log(`   Has Error: ${!!transactionsError}`);
          console.log(`   Error Code: ${transactionsError?.code}`);
          console.log(`   Error Message: ${transactionsError?.message}`);
          console.log(`   Query Status: ${queryStatus}`);

          if (allTransactions && allTransactions.length > 0) {
            console.log(`   Sample Transactions (first 2):`, allTransactions.slice(0, 2));
          }

          if (transactionsError) {
            console.error(`❌ STEP 2 FAILED: Error fetching transactions`);
            console.error(`   Error Code: ${transactionsError.code}`);
            console.error(`   Error Message: ${transactionsError.message}`);
            console.error(`   Error Details:`, transactionsError.details);
            console.error(`   Error Hint: ${transactionsError.hint}`);
            console.error(`   Is RLS Issue: ${transactionsError.code === '42501' || transactionsError.message?.includes('policy')}`);
            console.warn("⚠️ Position calculation failed, but transaction was saved successfully");
            toast.warning("Transaction saved but position calculation failed. Please refresh the page.");
          }

          // STEP 3: Calculate total shares owned
          console.log(`\n📍 STEP 3: Calculating total shares owned...`);

          const activeTransactions = (allTransactions || []).filter(tx => {
            const status = String(tx.status || '').toUpperCase();
            return status === 'ACTIVE' || status === 'Active';
          });

          console.log(`   Total Transactions: ${allTransactions?.length || 0}`);
          console.log(`   Active Transactions: ${activeTransactions.length}`);

          // FIX: The share_quantity in transfers_new is already stored with correct sign:
          // - Credits (IPO, DWAC Deposit, etc.): POSITIVE values
          // - Debits (DWAC Withdrawal, Transfer Debit, etc.): NEGATIVE values
          // So we just sum them directly without conditional negation.
          const totalShares = activeTransactions.reduce((sum, tx) => {
            const qty = Number(tx.share_quantity) || 0;
            const type = (tx.transaction_type || '').trim();

            console.log(`      [TX] ${type}: ${qty >= 0 ? '+' : ''}${qty} | Running Sum: ${sum + qty}`);

            return sum + qty;  // Simply add - sign is already correct in DB
          }, 0);

          console.log(`✅ STEP 3 SUCCESS: Total shares calculated`);
          console.log(`   Total Shares Owned: ${totalShares.toLocaleString()}`);
          console.log(`   Shareholder ID: ${previewData.shareholder.id}`);
          console.log(`   Security ID: ${securityData.id}`);
          console.log(`   CUSIP: ${previewData.security.cusip}`);

          // STEP 4: Upsert shareholder position
          const positionData = {
            issuer_id: issuerId,
            shareholder_id: previewData.shareholder.id,
            security_id: securityData.id,
            shares_owned: totalShares,
            position_date: queryDate,
            updated_at: new Date().toISOString(),
          };

          console.log(`\n📍 STEP 4: Upserting position to database...`);
          console.log(`   Position Data:`, JSON.stringify(positionData, null, 2));

          const { data: upsertResult, error: positionError } = await supabase
            .from("shareholder_positions_new")
            .upsert(positionData, {
              onConflict: "issuer_id,shareholder_id,security_id,position_date",
            })
            .select();

          if (positionError) {
            console.error(`❌ STEP 4 FAILED: Position upsert error`);
            console.error(`   Error Code: ${positionError.code}`);
            console.error(`   Error Message: ${positionError.message}`);
            console.error(`   Error Details:`, positionError.details);
            console.error(`   Error Hint: ${positionError.hint}`);
            console.error(`   Position Data:`, positionData);
            toast.warning("Transaction processed but position update failed");
          } else {
            const duration = Date.now() - positionStartTime;
            console.log(`✅ STEP 4 SUCCESS: Position upserted successfully`);
            console.log(`   Upsert Result:`, upsertResult);
            console.log(`\n${'='.repeat(80)}`);
            console.log(`✅ [POSITION UPDATE COMPLETE] - SUCCESS`);
            console.log(`   Security: ${previewData.security.class_name}`);
            console.log(`   Final Balance: ${totalShares.toLocaleString()}`);
            console.log(`   Total Duration: ${duration}ms`);
            console.log(`${'='.repeat(80)}\n`);
          }
        } catch (positionUpdateError) {
          const duration = Date.now() - positionStartTime;
          console.error(`\n${'='.repeat(80)}`);
          console.error(`❌ [POSITION UPDATE FAILED] - EXCEPTION THROWN`);
          console.error(`   Transaction Type: ${previewData.transaction_type}`);
          console.error(`   Security: ${previewData.security.class_name}`);
          console.error(`   Error Type: ${positionUpdateError.constructor.name}`);
          console.error(`   Error Message: ${positionUpdateError.message}`);
          console.error(`   Error Stack:`, positionUpdateError.stack);
          console.error(`   Duration before failure: ${duration}ms`);
          console.error(`${'='.repeat(80)}\n`);
          // Don't fail the entire transaction if position update fails
          toast.warning("Transaction processed but position may need manual update");
        }
      }

      // ⚡ Invalidate TanStack Query caches so fresh data loads when they visit
      invalidateAll(issuerId);
      console.log('✅ Invalidated TanStack Query cache after transaction processing');

      // Only show success message for non-Split transactions (Split already shows message)
      if (previewData.transaction_type !== "Split") {
        toast.success(`Transaction processed successfully${selectedRestrictionTemplate ? ' with restriction applied' : ''}`, {
          action: {
            label: "View Record Book",
            onClick: () => window.location.href = `/issuer/${issuerId}/record-keeping?refresh=true`,
          },
          duration: 5000,
        });
      }

      // Reset form
      setTransactionType("");
      setSelectedSecurity("");
      setSelectedShareholder("");
      setShareQuantity("");
      setNotes("");
      setSelectedRestrictionTemplate(null); // ✅ RESET restriction
      setPreviewData(null);
      setClassAShares(0);
      setRights(0);
    } catch (error) {
      console.error("Error processing transaction:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error(
        `Failed to process transaction: ${error.message || "Unknown error occurred"}`,
      );
    } finally {
      setProcessing(false);
    }
  };

  // ⚡ PROGRESSIVE LOADING: Only block during auth initialization
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

  // Check permissions using AuthContext
  const hasEditPermission = canEdit();

  if (!hasEditPermission) {
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
              <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Access Restricted
              </h3>
              <p className="text-muted-foreground">
                You don't have permission to access transaction processing
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                      <span className="text-secondary-custom">Transaction</span> Processing
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Core mechanism for processing shareholder data
                      modifications
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Note: Use dedicated pages for creating new shareholders
                      and securities
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={refreshData}
                      disabled={isRefreshing}
                      variant="outline"
                      className="border-input hover:bg-accent hover:text-accent-foreground"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    {(userRole === 'superadmin' || userRole === 'admin') && (
                      <Button
                        onClick={() => setSplitConfigOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Configure Split Ratios
                      </Button>
                    )}

                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Transaction Form */}
                <Card className="card-glass border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ArrowRightLeft className="mr-2 h-5 w-5" />
                      Process New Transaction
                    </CardTitle>
                    <CardDescription>
                      Select transaction type and enter details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {dataLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                          <p className="text-sm text-muted-foreground">Loading form data...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {transactionType && (
                          <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                            <p className="text-sm font-medium text-foreground">
                              {getTransactionHint(transactionType)}
                            </p>
                          </div>
                        )}

                        {/* Transaction Type Selection */}
                        <div>
                          <Label>Transaction Type</Label>
                          <Select
                            value={transactionType}
                            onValueChange={setTransactionType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select transaction type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IPO">
                                Original Issuance (IPO)
                              </SelectItem>
                              <SelectItem value="Split">
                                Split (Units → Class A + {activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"})
                              </SelectItem>
                              <SelectItem value="DWAC Deposit">
                                DWAC Deposit
                              </SelectItem>
                              <SelectItem value="DWAC Withdrawal">
                                DWAC Withdrawal
                              </SelectItem>
                              <SelectItem value="Transfer Credit">
                                Transfer Credit
                              </SelectItem>
                              <SelectItem value="Transfer Debit">
                                Transfer Debit
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Security Selection */}
                        <div>
                          <Label>Security</Label>
                          <Select
                            value={selectedSecurity}
                            onValueChange={setSelectedSecurity}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select security" />
                            </SelectTrigger>
                            <SelectContent>
                              {securities
                                .filter((security) => {
                                  // For Split transactions, only show Units
                                  if (transactionType === "Split") {
                                    return security.class_name?.toLowerCase().includes("unit");
                                  }
                                  // For all other transactions, show all securities
                                  return true;
                                })
                                .map((security) => (
                                  <SelectItem key={security.id} value={security.id}>
                                    {security.issue_name} - {security.cusip || "N/A"}{" "}
                                    ({security.class_name})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {transactionType === "Split" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Only Units securities are shown for Split transactions
                            </p>
                          )}
                        </div>

                        {/* Shareholder Selection */}
                        <div>
                          <Label>Shareholder</Label>
                          <Select
                            value={selectedShareholder}
                            onValueChange={setSelectedShareholder}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select shareholder" />
                            </SelectTrigger>
                            <SelectContent>
                              {shareholders.map((shareholder) => (
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

                        {/* Share Quantity */}
                        <div>
                          <Label>Share Quantity</Label>
                          <Input
                            type="number"
                            placeholder="Enter number of shares"
                            value={shareQuantity}
                            onChange={(e) => setShareQuantity(e.target.value)}
                          />
                        </div>

                        {/* Transaction Date */}
                        <div>
                          <Label>Transaction Date</Label>
                          <Input
                            type="date"
                            value={transactionDate}
                            onChange={(e) => setTransactionDate(e.target.value)}
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            placeholder="Enter transaction notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>

                        {/* ✅ NEW: Beautiful Restriction Selection UI */}
                        {(() => {
                          const isCredit =
                            transactionType === "IPO" ||
                            transactionType === "DWAC Deposit" ||
                            transactionType === "Transfer Credit";

                          if (!isCredit) return null;

                          return (

                            <div className="space-y-4 p-5 bg-muted/30 border border-border rounded-lg shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-5 w-5 text-primary" />
                                  <Label className="text-foreground font-semibold text-base m-0">
                                    Share Restrictions (Optional)
                                  </Label>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/issuer/${issuerId}/restrictions`)}
                                  className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
                                >
                                  Manage Templates
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>

                              <p className="text-sm text-muted-foreground">
                                Apply a restriction template to these shares. The restriction will be recorded with the transaction.
                              </p>

                              <div className="space-y-3">
                                <div>
                                  <Label className="text-foreground font-medium">Select Restriction Template</Label>
                                  <Select
                                    value={selectedRestrictionTemplate || "none"}
                                    onValueChange={(value) =>
                                      setSelectedRestrictionTemplate(value === "none" ? null : value)
                                    }
                                  >
                                    <SelectTrigger className="mt-1.5 bg-background">
                                      <SelectValue placeholder={restrictionTemplatesLoading ? "Loading templates..." : "No restriction"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                                          <span className="text-muted-foreground">No restriction</span>
                                        </div>
                                      </SelectItem>
                                      {restrictionTemplatesLoading ? (
                                        <SelectItem value="loading" disabled>
                                          <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                            <span className="text-muted-foreground text-sm">Loading templates...</span>
                                          </div>
                                        </SelectItem>
                                      ) : restrictionTemplates.length > 0 ? (
                                        restrictionTemplates.map((template) => (
                                          <SelectItem key={template.id} value={template.id}>
                                            <div className="flex flex-col py-1">
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                <span className="font-semibold text-foreground">
                                                  {template.restriction_type}
                                                </span>
                                              </div>
                                              {template.restriction_name && (
                                                <span className="text-xs text-muted-foreground ml-4">
                                                  {template.restriction_name}
                                                </span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-templates" disabled>
                                          <span className="text-muted-foreground text-sm">No templates available</span>
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>

                                  {restrictionTemplatesLoading ? (
                                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                      Loading templates...
                                    </div>
                                  ) : restrictionTemplates.length === 0 && restrictionTemplatesLoaded ? (
                                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      No templates found.{" "}
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/issuer/${issuerId}/restrictions`)}
                                        className="underline hover:text-foreground font-medium"
                                      >
                                        Create one first
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                {selectedRestrictionTemplate && (
                                  <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                    <div className="flex items-start gap-2 mb-2">
                                      <Eye className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                                        Restriction Preview
                                      </Label>
                                    </div>
                                    <div className="pl-6">
                                      <p className="text-sm font-semibold text-foreground mb-1">
                                        {restrictionTemplates.find(
                                          (t) => t.id === selectedRestrictionTemplate
                                        )?.restriction_type}
                                        {restrictionTemplates.find(
                                          (t) => t.id === selectedRestrictionTemplate
                                        )?.restriction_name && (
                                            <span className="text-muted-foreground font-normal">
                                              {" "}- {restrictionTemplates.find(
                                                (t) => t.id === selectedRestrictionTemplate
                                              )?.restriction_name}
                                            </span>
                                          )}
                                      </p>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {restrictionTemplates.find(
                                          (t) => t.id === selectedRestrictionTemplate
                                        )?.description || ""}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Transactions Blocked Warning (Suspended or Pending) */}
                        {areTransactionsBlocked() && (
                          <div className={`p-4 border rounded-lg ${isIssuerPending() ? 'bg-amber-500/10 border-amber-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                            <div className={`flex items-center gap-2 ${isIssuerPending() ? 'text-amber-700 dark:text-amber-400' : 'text-destructive'}`}>
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-semibold">
                                {isIssuerPending() ? 'Onboarding Mode' : 'Read-Only Mode'}
                              </span>
                            </div>
                            <p className={`text-sm mt-1 ${isIssuerPending() ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-destructive/80'}`}>
                              {isIssuerPending()
                                ? 'This issuer is pending activation. Transactions cannot be processed until the issuer goes live.'
                                : 'This issuer is suspended. Transactions cannot be processed.'}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-4">
                          <Button
                            variant="outline"
                            onClick={previewTransaction}
                            disabled={areTransactionsBlocked()}
                            className="flex-1 border-input hover:bg-accent hover:text-accent-foreground"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button
                            onClick={processTransaction}
                            disabled={
                              !previewData ||
                              processing ||
                              areTransactionsBlocked() ||
                              (previewData?.transaction_type === "Split" && previewData?.split_balances?.units.outcome < 0) ||
                              (previewData?.transaction_type !== "Split" && previewData?.outcome_balance < 0)
                            }
                            className="flex-1 bg-wealth-gradient text-black font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border-0 shadow-md"
                          >
                            {processing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Process Transaction
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Split Calculation for DWAC Withdrawal or Split */}
                        {((transactionType === "DWAC Withdrawal" && isCedeSelected) ||
                          transactionType === "Split") && (
                            <div className="p-4 bg-muted/50 border border-border rounded-md">
                              <h4 className="text-sm font-semibold text-foreground mb-3">
                                {transactionType === "Split" ? "Split Ratio Configuration" : "Split Calculation"}
                              </h4>

                              {/* Split Ratio Display */}
                              <div className="bg-card p-3 rounded border border-border mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-muted-foreground">Configured Ratio:</span>
                                  {(userRole === 'superadmin' || userRole === 'admin') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSplitConfigOpen(true)}
                                      className="h-6 text-xs text-primary hover:text-primary/90"
                                    >
                                      <Settings className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                                <div className="font-mono text-sm font-bold text-foreground">
                                  1 Unit → {splitRatios["DWAC Withdrawal"]?.classA || 1} Class A + {splitRatios["DWAC Withdrawal"]?.rights || 1} {activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"}
                                </div>
                              </div>

                              {/* Calculation Preview */}
                              {shareQuantity && (
                                <div className="bg-card p-3 rounded border border-border">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    {shareQuantity} Unit(s) will split into:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center">
                                      <span className="text-green-600 font-bold mr-1">+{classAShares}</span>
                                      <span className="text-muted-foreground">Class A</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-green-600 font-bold mr-1">+{rights}</span>
                                      <span className="text-muted-foreground">{activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {transactionType === "Split" && (
                                <p className="text-xs text-muted-foreground mt-3">
                                  ℹ️ This will create 3 transactions: Debit Units, Credit Class A, Credit {activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"}
                                </p>
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Transaction Preview - Always Visible */}
                <Card className={`border-2 shadow-lg overflow-hidden ${previewData ? 'border-secondary-custom/50' : 'border-border'}`}>
                  <CardHeader className="bg-muted/50 border-b border-border pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-foreground flex items-center gap-2">
                          Transaction Preview
                          {previewData && (
                            <Badge variant="outline" className="ml-2 bg-background">
                              {previewData.display_transaction_type}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {previewData ? 'Review the details before processing' : 'Fill out the form and click Preview to see transaction details'}
                        </CardDescription>
                      </div>
                      {previewData && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Transaction Date</div>
                          <div className="text-lg font-bold text-foreground">
                            {format(parseISO(previewData.transaction_date + 'T12:00:00'), "MMM d, yyyy")}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {!previewData ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Eye className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Preview Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Complete the transaction form and click the <strong>Preview</strong> button to see a detailed breakdown of how this transaction will affect shareholder balances.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Shareholder Info */}
                        <div className="flex items-center p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                            {previewData.shareholder.first_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Shareholder</div>
                            <div className="font-semibold text-foreground">
                              {previewData.shareholder.first_name} {previewData.shareholder.last_name}
                            </div>
                          </div>
                        </div>

                        {/* Split Transaction Preview */}
                        {previewData.transaction_type === "Split" && previewData.split_balances && (
                          <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Security</th>
                                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Type</th>
                                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Current</th>
                                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
                                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">New Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {/* Units Row */}
                                <tr className="hover:bg-muted/50">
                                  <td className="px-4 py-3 font-medium text-foreground">Units</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">Debit</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                    {previewData.split_balances.units.previous.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-destructive">
                                    -{previewData.share_quantity.toLocaleString()}
                                  </td>
                                  <td className={`px-4 py-3 text-right font-mono font-bold ${previewData.split_balances.units.outcome < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    {previewData.split_balances.units.outcome.toLocaleString()}
                                  </td>
                                </tr>

                                {/* Class A Row */}
                                <tr className="hover:bg-muted/50">
                                  <td className="px-4 py-3 font-medium text-foreground">Class A</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">Credit</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                    {previewData.split_balances.classA.previous.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                                    +{previewData.class_a.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                                    {previewData.split_balances.classA.outcome.toLocaleString()}
                                  </td>
                                </tr>

                                {/* Rights/Warrants Row */}
                                <tr className="hover:bg-muted/50">
                                  <td className="px-4 py-3 font-medium text-foreground">
                                    {previewData.split_balances.warrants.label || (activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants")}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">Credit</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                    {previewData.split_balances.warrants.previous.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                                    +{previewData.rights.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                                    {previewData.split_balances.warrants.outcome.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div>
                          <Label className="text-muted-foreground">
                            {previewData.transaction_type === "Split" ? "Securities Involved" : "Security"}
                          </Label>
                          {previewData.transaction_type === "Split" && previewData.all_securities ? (
                            <div className="mt-2 space-y-3">
                              {/* Units Security */}
                              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-sm font-semibold text-foreground">
                                    {previewData.all_securities.units?.issue_name || "Units"}
                                  </div>
                                  <Badge variant="destructive" className="text-xs">Debit</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {previewData.all_securities.units?.cusip || "N/A"} - {previewData.all_securities.units?.class_name}
                                </div>
                              </div>

                              {/* Class A Security */}
                              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-sm font-semibold text-foreground">
                                    {previewData.all_securities.classA?.issue_name || "Class A"}
                                  </div>
                                  <Badge className="bg-green-600 dark:bg-green-500 text-white dark:text-black text-xs">Credit</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {previewData.all_securities.classA?.cusip || "N/A"} - {previewData.all_securities.classA?.class_name}
                                </div>
                              </div>

                              {/* Warrant/Right Security */}
                              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-sm font-semibold text-foreground">
                                    {previewData.all_securities.warrant?.issue_name || (activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants")}
                                  </div>
                                  <Badge className="bg-green-600 dark:bg-green-500 text-white dark:text-black text-xs">Credit</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {previewData.all_securities.warrant?.cusip || "N/A"} - {previewData.all_securities.warrant?.class_name}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium text-foreground mt-1">
                                {previewData.security.issue_name}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {previewData.security.cusip || "N/A"} -{" "}
                                {previewData.security.class_name}
                              </div>
                            </>
                          )}
                        </div>

                        <Separator />

                        <div>
                          <Label className="text-muted-foreground">
                            Share Quantity (Units)
                          </Label>
                          <div className="text-2xl font-extrabold text-foreground mt-1">
                            {previewData.share_quantity.toLocaleString()}
                          </div>
                        </div>

                        <Separator />

                        {/* Balance Information */}
                        {previewData.transaction_type !== "Split" && (
                          <div className={`bg-card border-2 rounded-lg p-4 ${previewData.outcome_balance < 0
                            ? 'border-destructive/50'
                            : previewData.credit_debit === "Credit" ? 'border-green-500/50 dark:border-green-400/50' : 'border-destructive/50'
                            }`}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className={`text-sm font-bold ${previewData.outcome_balance < 0
                                ? 'text-destructive'
                                : previewData.credit_debit === "Credit" ? 'text-green-700 dark:text-green-400' : 'text-destructive'
                                }`}>
                                {previewData.security.issue_name}
                              </h4>
                              <Badge className={`text-xs ${previewData.credit_debit === "Credit" ? 'bg-green-600 dark:bg-green-500 text-white dark:text-black' : 'bg-destructive'
                                }`}>
                                {previewData.credit_debit}
                              </Badge>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                                <div className="text-2xl font-bold text-foreground">
                                  {previewData.previous_balance?.toLocaleString() || 0}
                                </div>
                              </div>
                              <div className={`flex items-center ${previewData.credit_debit === "Credit" ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                                }`}>
                                <TrendingUp className={`h-4 w-4 mr-1 ${previewData.credit_debit === "Credit" ? '' : 'rotate-180'
                                  }`} />
                                <span className="text-sm font-semibold">
                                  {previewData.credit_debit === "Credit" ? '+' : '-'}
                                  {previewData.share_quantity.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Outcome Balance</div>
                                <div className={`text-xl font-bold ${previewData.outcome_balance < 0
                                  ? 'text-destructive'
                                  : previewData.credit_debit === "Credit" ? 'text-green-700 dark:text-green-400' : 'text-foreground'
                                  }`}>
                                  {previewData.outcome_balance?.toLocaleString() || 0}
                                </div>
                                {previewData.outcome_balance < 0 && (
                                  <div className="text-xs text-destructive font-medium mt-1">
                                    ⚠ Negative balance warning
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {previewData.notes && (
                          <>
                            <Separator />
                            <div>
                              <Label className="text-muted-foreground">Notes</Label>
                              <div className="text-sm text-foreground mt-1 p-3 bg-muted/50 rounded-md">
                                {previewData.notes}
                              </div>
                            </div>
                          </>
                        )}

                        {/* ✅ NEW: Restriction Preview in Transaction Preview */}
                        {previewData.restriction_template && (
                          <>
                            <Separator />
                            <div>
                              <Label className="text-muted-foreground flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Applied Restriction
                              </Label>
                              <div className="mt-2 p-4 bg-muted/30 border border-border rounded-lg shadow-sm">
                                <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                  <Badge className="bg-primary">
                                    {previewData.restriction_template.restriction_type}
                                  </Badge>
                                  {previewData.restriction_template.restriction_name && (
                                    <span className="text-sm text-muted-foreground">
                                      {previewData.restriction_template.restriction_name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                  {previewData.restriction_template.description}
                                </p>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Negative Balance Warning */}
                        {(() => {
                          let hasNegativeBalance = false;
                          let warningMessage = "";

                          if (previewData.transaction_type === "Split") {
                            if (previewData.split_balances?.units.outcome < 0) {
                              hasNegativeBalance = true;
                              warningMessage = `Insufficient Units! Shareholder has ${previewData.split_balances.units.previous.toLocaleString()} Units but needs ${previewData.share_quantity.toLocaleString()} Units. This transaction will be blocked.`;
                            }
                          } else if (previewData.outcome_balance < 0) {
                            hasNegativeBalance = true;
                            warningMessage = `Insufficient balance! Shareholder has ${previewData.previous_balance.toLocaleString()} shares but needs ${previewData.share_quantity.toLocaleString()} shares. This transaction will be blocked.`;
                          }

                          if (hasNegativeBalance) {
                            return (
                              <div className="bg-destructive/10 border-2 border-destructive/20 rounded-md p-4">
                                <div className="flex items-start">
                                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                                  <div>
                                    <h4 className="text-sm font-bold text-destructive">
                                      Transaction Blocked - Insufficient Balance
                                    </h4>
                                    <p className="text-sm text-destructive-foreground mt-1">
                                      {warningMessage}
                                    </p>
                                    <p className="text-sm text-destructive-foreground mt-2 font-medium">
                                      ➡️ Next Steps: First credit shares via IPO, DWAC Deposit, or Transfer Credit
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-4">
                              <div className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
                                <div>
                                  <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
                                    Ready to Process
                                  </h4>
                                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                    This transaction will be permanently added to
                                    the transfer journal and update all related
                                    records.
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Split Ratio Configuration Modal */}
      <Dialog open={splitConfigOpen} onOpenChange={setSplitConfigOpen}>
        <DialogContent className="max-w-2xl h-auto p-0 gap-0 flex flex-col">
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-xl font-semibold">
              Configure Unit Split Ratios
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Set how many Class A shares and {activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"} each Unit converts to when split.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-8 py-6">
            <SplitRatioManager
              onClose={() => setSplitConfigOpen(false)}
              issuerId={issuerId}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
