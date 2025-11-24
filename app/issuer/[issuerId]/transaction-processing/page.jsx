"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import SplitRatioManager from "@/components/SplitRatioManager";
import { toDBDate, toUSDate, getTodayDBDate } from "@/lib/dateUtils";
import { format } from "date-fns";

export default function TransactionProcessingPage({ params: paramsPromise }) {
  const [issuerId, setIssuerId] = useState(null);
  const router = useRouter();

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

  // ⚡ SUPER FAST SWR CACHING - Instant page loads after first visit
  const swrFetcher = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
    return res.json();
  };

  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 min - instant cache hits
    revalidateIfStale: false,
  };

  const { data: securities = [], isLoading: securitiesLoading } = useSWR(
    issuerId ? `/api/securities?issuerId=${issuerId}` : null,
    swrFetcher,
    swrConfig
  );

  const { data: shareholders = [], isLoading: shareholdersLoading } = useSWR(
    issuerId ? `/api/shareholders?issuerId=${issuerId}` : null,
    swrFetcher,
    swrConfig
  );

  const { data: splits = [], isLoading: splitsLoading } = useSWR(
    issuerId ? `/api/splits?issuerId=${issuerId}` : null,
    swrFetcher,
    swrConfig
  );

  // Data states
  const [restrictions, setRestrictions] = useState([]);
  const [restrictionsLoaded, setRestrictionsLoaded] = useState(false); // Track if restrictions are loaded
  const dataLoading = securitiesLoading || shareholdersLoading || splitsLoading || !activeIssuer;

  // ⚡ Compute split ratios from SWR data using useMemo
  const splitRatios = useMemo(() => {
    const ratiosMap = {};
    (splits || []).forEach((s) => {
      if (s.transaction_type) {
        ratiosMap[s.transaction_type] = {
          classA: s.class_a_ratio ?? 0,
          rights: s.rights_ratio ?? 0,
        };
      }
    });
    return ratiosMap;
  }, [splits]);

  // Transaction form states
  const [transactionType, setTransactionType] = useState("");
  const [selectedSecurity, setSelectedSecurity] = useState("");
  const [selectedShareholder, setSelectedShareholder] = useState("");
  const [shareQuantity, setShareQuantity] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    getTodayDBDate(),
  );
  const [notes, setNotes] = useState("");

  // Restriction states for credit transactions
  const [addRestriction, setAddRestriction] = useState(false);
  const [restrictionType, setRestrictionType] = useState("");
  const [restrictionDescription, setRestrictionDescription] = useState("");

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

  // ⚡ NEW: Lazy load restrictions only when needed
  const fetchRestrictionsIfNeeded = async () => {
    if (restrictionsLoaded) {
      return; // Already loaded, skip
    }

    try {
      const response = await fetch(`/api/active-restrictions?issuerId=${issuerId}`);
      const data = await response.json();
      setRestrictions(data || []);
      setRestrictionsLoaded(true);
      console.log(`✅ Lazy-loaded ${data?.length || 0} active restrictions`);
    } catch (error) {
      console.error("Error fetching restrictions:", error);
      // Don't fail validation if restrictions can't be loaded
      setRestrictions([]);
      setRestrictionsLoaded(true);
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

    // ⚡ OPTIMIZED: Fetch restrictions only when validating (lazy load)
    await fetchRestrictionsIfNeeded();

    // Check for restrictions
    const security = securities.find((s) => s.id === selectedSecurity);
    const shareholder = shareholders.find((s) => s.id === selectedShareholder);

    if (security && shareholder) {
      // ⚡ CRITICAL FIX: Ensure restrictions is always an array
      const restrictionsArray = Array.isArray(restrictions) ? restrictions : [];
      const applicableRestrictions = restrictionsArray.filter(
        (r) =>
          r.shareholder_id === shareholder.id &&
          r.cusip === security.cusip &&
          r.is_active,
      );

      if (applicableRestrictions.length > 0) {
        const restrictionTypes = applicableRestrictions
          .map((r) => r.restriction_type)
          .join(", ");
        toast.warning(
          `Warning: Shareholder has restrictions (${restrictionTypes}) on this security`,
        );
      }
    }

    return true;
  };

  const previewTransaction = async () => {
    // ⚡ UPDATED: Now async to support lazy-loading restrictions
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

    setPreviewData({
      transaction_type: transactionType,
      display_transaction_type:
        transactionType === "IPO" ? "Original Issuance" :
          transactionType === "Split" ? `Split (Units → Class A + ${secondSecurityLabel})` :
            transactionType,
      security: security,
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
    });
  };

  const processTransaction = async () => {
    if (!previewData) return;

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
        const debitUnitsData = {
          issuer_id: issuerId,
          cusip: unitsecurity.cusip || "N/A",
          transaction_type: "DWAC Withdrawal",
          shareholder_id: previewData.shareholder.id,
          share_quantity: Math.floor(previewData.share_quantity), // Positive - transaction_type determines debit/credit
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

        // Update shareholder positions for all 3 securities affected by split
        try {
          console.log("📊 Updating shareholder positions for split transactions...");

          // Helper function to update position for a security
          const updatePositionForSecurity = async (cusip, securityName) => {
            // Get security_id from CUSIP
            const { data: securityData, error: securityError } = await supabase
              .from("securities_new")
              .select("id")
              .eq("cusip", cusip)
              .eq("issuer_id", issuerId)
              .single();

            if (securityError) {
              console.warn(`⚠️ Could not find security ${securityName}:`, securityError);
              return;
            }

            // Calculate total shares for this shareholder + security up to this date
            const { data: allTransactions, error: transactionsError } = await supabase
              .from("transfers_new")
              .select("share_quantity, transaction_type, credit_debit")
              .eq("issuer_id", issuerId)
              .eq("shareholder_id", previewData.shareholder.id)
              .eq("cusip", cusip)
              .eq("status", "Active")
              .lte("transaction_date", previewData.transaction_date);

            if (transactionsError) {
              console.warn(`⚠️ Error fetching transactions for ${securityName}:`, transactionsError);
              return;
            }

            // Calculate total shares owned (Credit adds, Debit subtracts)
            const totalShares = (allTransactions || []).reduce((sum, tx) => {
              const qty = Number(tx.share_quantity) || 0;

              // 1. Check credit_debit column first (consistent with Import)
              if (tx.credit_debit) {
                const cdStr = String(tx.credit_debit).toLowerCase();
                if (cdStr.includes('debit') || cdStr.includes('withdrawal')) {
                  return sum - qty;
                }
                return sum + qty;
              }

              // 2. Fallback to transaction_type
              const isDebit = tx.transaction_type === 'DWAC Withdrawal' || tx.transaction_type === 'Transfer Debit';
              return sum + (isDebit ? -qty : qty);
            }, 0);

            console.log(`📈 ${securityName}: ${totalShares} shares for shareholder ${previewData.shareholder.id}`);

            // Upsert shareholder position
            const positionData = {
              issuer_id: issuerId,
              shareholder_id: previewData.shareholder.id,
              security_id: securityData.id,
              shares_owned: totalShares,
              position_date: previewData.transaction_date,
              updated_at: new Date().toISOString(),
            };

            const { error: positionError } = await supabase
              .from("shareholder_positions_new")
              .upsert(positionData, {
                onConflict: "issuer_id,shareholder_id,security_id,position_date",
              });

            if (positionError) {
              console.warn(`⚠️ Error updating position for ${securityName}:`, positionError);
            } else {
              console.log(`✅ Updated position for ${securityName}`);
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

        toast.success(`Split transaction processed successfully! Created 3 transactions.`, {
          action: {
            label: "View Record Book",
            onClick: () => window.location.href = `/issuer/${issuerId}/record-keeping`,
          },
          duration: 5000,
        });

      } else {
        // Regular single transaction processing
        const transactionData = {
          issuer_id: issuerId,
          cusip: previewData.security.cusip || "N/A",
          transaction_type: previewData.transaction_type,
          shareholder_id: previewData.shareholder.id,
          share_quantity: Math.floor(previewData.share_quantity),
          transaction_date: previewData.transaction_date,
          status: "Active",
          certificate_type: "Book Entry",
          notes: previewData.notes || null,
        };

        console.log("📝 Transaction data to insert:", transactionData);

        const { data: transactionResult, error } = await supabase
          .from("transfers_new")
          .insert([transactionData])
          .select();

        console.log("🔍 Insert result:", { data: transactionResult, error });

        if (error) {
          console.error("🚨 Database error details:", error);
          throw new Error(
            `Database error: ${error.message || JSON.stringify(error)}`,
          );
        }
      }

      // ✅ UPDATE SHAREHOLDER POSITIONS: Calculate and update current position
      // Skip position update for Split transactions as they create multiple securities
      if (previewData.transaction_type !== "Split") {
        try {
          console.log("📊 Updating shareholder positions...");

          // Get security_id from CUSIP
          const { data: securityData, error: securityError } = await supabase
            .from("securities_new")
            .select("id")
            .eq("cusip", previewData.security.cusip)
            .eq("issuer_id", issuerId)
            .single();

          if (securityError) {
            console.error("⚠️ Error fetching security:", securityError);
            throw new Error("Could not find security for position update");
          }

          // Calculate total shares for this shareholder + security up to this date
          const { data: allTransactions, error: transactionsError } = await supabase
            .from("transfers_new")
            .select("share_quantity, transaction_type, credit_debit")
            .eq("issuer_id", issuerId)
            .eq("shareholder_id", previewData.shareholder.id)
            .eq("cusip", previewData.security.cusip)
            .eq("status", "Active")
            .lte("transaction_date", previewData.transaction_date);

          if (transactionsError) {
            console.error("⚠️ Error fetching transactions:", transactionsError);
            throw new Error("Could not calculate shareholder position");
          }

          // Calculate total shares owned (Credit adds, Debit subtracts)
          const totalShares = (allTransactions || []).reduce((sum, tx) => {
            const qty = Number(tx.share_quantity) || 0;

            // 1. Check credit_debit column first (consistent with Import)
            if (tx.credit_debit) {
              const cdStr = String(tx.credit_debit).toLowerCase();
              if (cdStr.includes('debit') || cdStr.includes('withdrawal')) {
                return sum - qty;
              }
              return sum + qty;
            }

            // 2. Fallback to transaction_type
            const isDebit = tx.transaction_type === 'DWAC Withdrawal' || tx.transaction_type === 'Transfer Debit';
            return sum + (isDebit ? -qty : qty);
          }, 0);

          console.log(`📈 Calculated position: ${totalShares} shares for shareholder ${previewData.shareholder.id}`);

          // Upsert shareholder position
          const positionData = {
            issuer_id: issuerId,
            shareholder_id: previewData.shareholder.id,
            security_id: securityData.id,
            shares_owned: totalShares,
            position_date: previewData.transaction_date,
            updated_at: new Date().toISOString(),
          };

          const { error: positionError } = await supabase
            .from("shareholder_positions_new")
            .upsert(positionData, {
              onConflict: "issuer_id,shareholder_id,security_id,position_date",
            });

          if (positionError) {
            console.error("⚠️ Error updating position:", positionError);
            toast.warning("Transaction processed but position update failed");
          } else {
            console.log("✅ Shareholder position updated successfully");
          }
        } catch (positionUpdateError) {
          console.error("⚠️ Position update error:", positionUpdateError);
          // Don't fail the entire transaction if position update fails
          toast.warning("Transaction processed but position may need manual update");
        }
      }

      // ⚡ OPTIMIZED: Use new active-restrictions API endpoint
      if (addRestriction && restrictionType && restrictionDescription) {
        const restrictionData = {
          issuer_id: issuerId,
          shareholder_id: previewData.shareholder.id,
          cusip: previewData.security.cusip,
          restriction_type: restrictionType,
          description: restrictionDescription,
        };

        try {
          const restrictionResponse = await fetch('/api/active-restrictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restrictionData),
          });

          if (!restrictionResponse.ok) {
            console.error("Error adding restriction:", await restrictionResponse.text());
            toast.warning("Transaction processed but failed to add restriction");
          } else {
            // Invalidate restrictions cache to reload on next validation
            setRestrictionsLoaded(false);
            toast.success(
              `Transaction processed successfully with restriction added`,
            );
          }
        } catch (restrictionError) {
          console.error("Error adding restriction:", restrictionError);
          toast.warning("Transaction processed but failed to add restriction");
        }
      } else if (previewData.transaction_type !== "Split") {
        // Only show success message for non-Split transactions (Split already shows message)
        toast.success(`Transaction processed successfully`, {
          action: {
            label: "View Record Book",
            onClick: () => window.location.href = `/issuer/${issuerId}/record-keeping`,
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
      setAddRestriction(false);
      setRestrictionType("");
      setRestrictionDescription("");
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
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check permissions using AuthContext
  const hasEditPermission = canEdit();

  if (!hasEditPermission) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
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
              <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Restricted
              </h3>
              <p className="text-gray-500">
                You don't have permission to access transaction processing
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
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
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      Transaction Processing
                    </h1>
                    <p className="text-lg text-gray-600">
                      Core mechanism for processing shareholder data
                      modifications
                    </p>
                    <p className="text-sm text-orange-600 mt-2">
                      Note: Use dedicated pages for creating new shareholders
                      and securities
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {(userRole === 'superadmin' || userRole === 'admin') && (
                      <Button
                        onClick={() => setSplitConfigOpen(true)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Configure Split Ratios
                      </Button>
                    )}
                    <Zap className="h-8 w-8 text-orange-500" />
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
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
                          <p className="text-sm text-gray-600">Loading form data...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {transactionType && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                            <p className="text-sm font-medium text-orange-700">
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
                            <SelectTrigger className="border-orange-200 focus:border-orange-500 focus:ring-orange-500/20">
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
                            <SelectTrigger className="border-orange-200 focus:border-orange-500 focus:ring-orange-500/20">
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
                            <p className="text-xs text-gray-500 mt-1">
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
                            <SelectTrigger className="border-orange-200 focus:border-orange-500 focus:ring-orange-500/20">
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
                            className="border-orange-200 focus:border-orange-500 focus:ring-orange-500/20"
                          />
                        </div>

                        {/* Transaction Date */}
                        <div>
                          <Label>Transaction Date</Label>
                          <Input
                            type="date"
                            value={transactionDate}
                            onChange={(e) => setTransactionDate(e.target.value)}
                            className="border-orange-200 focus:border-orange-500 focus:ring-orange-500/20"
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            placeholder="Enter transaction notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="border-orange-200 focus:border-orange-500 focus:ring-orange-500/20"
                          />
                        </div>

                        {/* Restriction Option for Credit Transactions */}
                        {(() => {
                          const isCredit =
                            transactionType === "IPO" ||
                            transactionType === "DWAC Deposit" ||
                            transactionType === "Transfer Credit";

                          if (!isCredit) return null;

                          return (
                            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="addRestriction"
                                  checked={addRestriction}
                                  onChange={(e) =>
                                    setAddRestriction(e.target.checked)
                                  }
                                  className="rounded"
                                />
                                <Label
                                  htmlFor="addRestriction"
                                  className="text-blue-800 font-medium"
                                >
                                  Add restriction to these shares
                                </Label>
                              </div>

                              {addRestriction && (
                                <div className="space-y-3 ml-6">
                                  <div>
                                    <Label>Restriction Type</Label>
                                    <Select
                                      value={restrictionType}
                                      onValueChange={setRestrictionType}
                                    >
                                      <SelectTrigger className="border-blue-200 focus:border-blue-500">
                                        <SelectValue placeholder="Select restriction type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Lock-up">
                                          Lock-up Period
                                        </SelectItem>
                                        <SelectItem value="Trading Restriction">
                                          Trading Restriction
                                        </SelectItem>
                                        <SelectItem value="Transfer Restriction">
                                          Transfer Restriction
                                        </SelectItem>
                                        <SelectItem value="Voting Restriction">
                                          Voting Restriction
                                        </SelectItem>
                                        <SelectItem value="SEC Rule 144">
                                          SEC Rule 144
                                        </SelectItem>
                                        <SelectItem value="Custom">
                                          Custom Restriction
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Restriction Description</Label>
                                    <Textarea
                                      placeholder="Enter restriction details..."
                                      value={restrictionDescription}
                                      onChange={(e) =>
                                        setRestrictionDescription(e.target.value)
                                      }
                                      className="border-blue-200 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Action Buttons */}
                        <div className="flex space-x-4">
                          <Button
                            variant="outline"
                            onClick={previewTransaction}
                            className="flex-1 border-orange-300 hover:bg-orange-50 hover:border-orange-500 text-orange-700"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button
                            onClick={processTransaction}
                            disabled={
                              !previewData ||
                              processing ||
                              (previewData?.transaction_type === "Split" && previewData?.split_balances?.units.outcome < 0) ||
                              (previewData?.transaction_type !== "Split" && previewData?.outcome_balance < 0)
                            }
                            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                              <h4 className="text-sm font-semibold text-blue-900 mb-3">
                                {transactionType === "Split" ? "Split Ratio Configuration" : "Split Calculation"}
                              </h4>

                              {/* Split Ratio Display */}
                              <div className="bg-white p-3 rounded border border-blue-200 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-600">Configured Ratio:</span>
                                  {(userRole === 'superadmin' || userRole === 'admin') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSplitConfigOpen(true)}
                                      className="h-6 text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      <Settings className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                                <div className="font-mono text-sm font-bold text-blue-900">
                                  1 Unit → {splitRatios["DWAC Withdrawal"]?.classA || 1} Class A + {splitRatios["DWAC Withdrawal"]?.rights || 1} {activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"}
                                </div>
                              </div>

                              {/* Calculation Preview */}
                              {shareQuantity && (
                                <div className="bg-white p-3 rounded border border-blue-200">
                                  <p className="text-xs font-medium text-gray-600 mb-2">
                                    {shareQuantity} Unit(s) will split into:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center">
                                      <span className="text-green-600 font-bold mr-1">+{classAShares}</span>
                                      <span className="text-gray-700">Class A</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-green-600 font-bold mr-1">+{rights}</span>
                                      <span className="text-gray-700">{activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {transactionType === "Split" && (
                                <p className="text-xs text-gray-600 mt-3">
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
                <Card className={`border-2 shadow-lg overflow-hidden ${previewData ? 'border-blue-100' : 'border-gray-200'}`}>
                      <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                              Transaction Preview
                              {previewData && (
                                <Badge variant="outline" className="ml-2 bg-white">
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
                              <div className="text-sm font-medium text-gray-500">Transaction Date</div>
                              <div className="text-lg font-bold text-gray-900">
                                {format(new Date(previewData.transaction_date), "MMM d, yyyy")}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {!previewData ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Eye className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Preview Yet</h3>
                            <p className="text-sm text-gray-500 max-w-md">
                              Complete the transaction form and click the <strong>Preview</strong> button to see a detailed breakdown of how this transaction will affect shareholder balances.
                            </p>
                          </div>
                        ) : (
                        <div className="space-y-6">
                          {/* Shareholder Info */}
                          <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-4">
                              {previewData.shareholder.first_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Shareholder</div>
                              <div className="font-semibold text-gray-900">
                                {previewData.shareholder.first_name} {previewData.shareholder.last_name}
                              </div>
                            </div>
                          </div>

                          {/* Split Transaction Preview */}
                          {previewData.transaction_type === "Split" && previewData.split_balances && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Security</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Type</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Current</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Change</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700">New Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {/* Units Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">Units</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">Debit</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                                      {previewData.split_balances.units.previous.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                                      -{previewData.share_quantity.toLocaleString()}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${previewData.split_balances.units.outcome < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                      {previewData.split_balances.units.outcome.toLocaleString()}
                                    </td>
                                  </tr>

                                  {/* Class A Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">Class A</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">Credit</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                                      {previewData.split_balances.classA.previous.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-green-600">
                                      +{previewData.class_a.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                                      {previewData.split_balances.classA.outcome.toLocaleString()}
                                    </td>
                                  </tr>

                                  {/* Rights/Warrants Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {previewData.split_balances.warrants.label || (activeIssuer?.split_security_type === "Right" ? "Rights" : "Warrants")}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">Credit</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                                      {previewData.split_balances.warrants.previous.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-green-600">
                                      +{previewData.rights.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                                      {previewData.split_balances.warrants.outcome.toLocaleString()}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div>
                            <Label className="text-gray-600">Security</Label>
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              {previewData.security.issue_name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {previewData.security.cusip || "N/A"} -{" "}
                              {previewData.security.class_name}
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <Label className="text-gray-600">
                              Share Quantity (Units)
                            </Label>
                            <div className="text-2xl font-extrabold text-gray-900 mt-1">
                              {previewData.share_quantity.toLocaleString()}
                            </div>
                          </div>

                          <Separator />

                          {/* Balance Information */}
                          {previewData.transaction_type !== "Split" && (
                            <div className={`bg-white border-2 rounded-lg p-4 ${previewData.outcome_balance < 0
                              ? 'border-red-300'
                              : previewData.credit_debit === "Credit" ? 'border-green-300' : 'border-red-300'
                              }`}>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className={`text-sm font-bold ${previewData.outcome_balance < 0
                                  ? 'text-red-800'
                                  : previewData.credit_debit === "Credit" ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                  {previewData.security.issue_name}
                                </h4>
                                <Badge className={`text-xs ${previewData.credit_debit === "Credit" ? 'bg-green-600' : 'bg-red-600'
                                  }`}>
                                  {previewData.credit_debit}
                                </Badge>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Current Balance</div>
                                  <div className="text-2xl font-bold text-gray-900">
                                    {previewData.previous_balance?.toLocaleString() || 0}
                                  </div>
                                </div>
                                <div className={`flex items-center ${previewData.credit_debit === "Credit" ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                  <TrendingUp className={`h-4 w-4 mr-1 ${previewData.credit_debit === "Credit" ? '' : 'rotate-180'
                                    }`} />
                                  <span className="text-sm font-semibold">
                                    {previewData.credit_debit === "Credit" ? '+' : '-'}
                                    {previewData.share_quantity.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Outcome Balance</div>
                                  <div className={`text-xl font-bold ${previewData.outcome_balance < 0
                                    ? 'text-red-700'
                                    : previewData.credit_debit === "Credit" ? 'text-green-700' : 'text-gray-900'
                                    }`}>
                                    {previewData.outcome_balance?.toLocaleString() || 0}
                                  </div>
                                  {previewData.outcome_balance < 0 && (
                                    <div className="text-xs text-red-600 font-medium mt-1">
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
                                <Label className="text-gray-600">Notes</Label>
                                <div className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                                  {previewData.notes}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Restrictions Check */}
                          {(() => {
                            // ⚡ CRITICAL FIX: Ensure restrictions is always an array
                            const restrictionsArray = Array.isArray(restrictions) ? restrictions : [];
                            const applicableRestrictions = restrictionsArray.filter(
                              (r) =>
                                r.shareholder_id === previewData.shareholder.id &&
                                r.cusip === previewData.security.cusip &&
                                r.is_active,
                            );

                            if (applicableRestrictions.length > 0) {
                              return (
                                <>
                                  <Separator />
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                                    <div className="flex items-start">
                                      <Shield className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                                      <div>
                                        <h4 className="text-sm font-medium text-yellow-800">
                                          Restrictions Applied
                                        </h4>
                                        <div className="text-sm text-yellow-700 mt-1">
                                          {applicableRestrictions.map((r) => (
                                            <div
                                              key={r.id}
                                              className="flex items-center mt-1"
                                            >
                                              <Badge
                                                variant="outline"
                                                className="mr-2"
                                              >
                                                {r.restriction_type}
                                              </Badge>
                                              <span>{r.description}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              );
                            }
                            return null;
                          })()}

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
                                <div className="bg-red-50 border-2 border-red-300 rounded-md p-4">
                                  <div className="flex items-start">
                                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                                    <div>
                                      <h4 className="text-sm font-bold text-red-800">
                                        Transaction Blocked - Insufficient Balance
                                      </h4>
                                      <p className="text-sm text-red-700 mt-1">
                                        {warningMessage}
                                      </p>
                                      <p className="text-sm text-red-700 mt-2 font-medium">
                                        ➡️ Next Steps: First credit shares via IPO, DWAC Deposit, or Transfer Credit
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                                <div className="flex items-start">
                                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
                                  <div>
                                    <h4 className="text-sm font-medium text-orange-800">
                                      Ready to Process
                                    </h4>
                                    <p className="text-sm text-orange-700 mt-1">
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

                {/* Transaction Type Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <Card className="card-glass border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Plus className="mr-2 h-5 w-5 text-blue-600" />
                        IPO Processing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">
                        Process IPO share issuances to initial shareholders
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Creates credit entries</li>
                        <li>• Validates against authorized shares</li>
                        <li>• Updates shareholder positions</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="card-glass border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <ArrowRightLeft className="mr-2 h-5 w-5 text-green-600" />
                        DWAC Processing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">
                        Handle DTC deposits and withdrawals
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• DWAC Deposits (DTC → Direct)</li>
                        <li>• DWAC Withdrawals (Direct → DTC)</li>
                        <li>• Cede & Co. integration</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="card-glass border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <User className="mr-2 h-5 w-5 text-purple-600" />
                        Transfer Processing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">
                        Process shareholder-to-shareholder transfers
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Transfer credits and debits</li>
                        <li>• Restriction validation</li>
                        <li>• Multi-step workflows</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
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
            <p className="text-sm text-gray-600 mt-1">
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