"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRestrictionsPageData } from "@/hooks/use-restrictions-page";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ShieldAlert,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  Edit,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function RestrictionsPage({ params: paramsPromise }) {
  const { user, userRole, userRoles, currentIssuer, availableIssuers, issuerSpecificRole, loading, initialized, validateAndSetIssuer, canEdit, isAdmin, isIssuerSuspended } = useAuth();
  const router = useRouter();
  const [issuerId, setIssuerId] = useState(null);

  // ⚡ TanStack Query - Parallel fetching with automatic caching
  const {
    restrictionTemplates,
    shareRestrictions,
    shareholderRestrictions,
    shareholders,
    securities,
    users,
    combinedRestrictions,
    isLoading: queryLoading,
    refetchAll,
    invalidateRestrictions,
    invalidateAll,
  } = useRestrictionsPageData(issuerId);

  // Check if initial data is loading
  const pageLoading = queryLoading;

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCusip, setSelectedCusip] = useState("all");
  const [selectedShareholder, setSelectedShareholder] = useState("all");
  const [selectedRestrictionType, setSelectedRestrictionType] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Modal states
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [showAddShareRestriction, setShowAddShareRestriction] = useState(false);
  const [showAddShareholderRestriction, setShowAddShareholderRestriction] =
    useState(false);
  const [showViewRestriction, setShowViewRestriction] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // ⚡ Manual restriction form states
  const [selectedShareholderForRestriction, setSelectedShareholderForRestriction] = useState(null);
  const [selectedCusipForRestriction, setSelectedCusipForRestriction] = useState(null);
  const [shareholderPositions, setShareholderPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [existingRestrictions, setExistingRestrictions] = useState([]);

  // ⚡ CRITICAL FIX: Prevent infinite loop from unstable dependencies
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (hasLoadedRef.current) return;
    if (!initialized || !user) return;

    const loadData = async () => {
      try {
        const params = await paramsPromise;
        const id = params.issuerId;

        // Guard against race conditions
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        setIssuerId(id); // This triggers SWR to fetch data automatically!

        if (!user) {
          router.push("/login");
          return;
        }

        // ⚡ Just validate auth - SWR handles all data fetching!
        const authResult = await validateAndSetIssuer(id);

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

  // ⚡ TanStack Query handles fetching - no manual fetchData needed!
  // Data is cached with 1min staleTime and revalidated on invalidation

  const createRestrictionTemplate = async (templateData) => {
    try {
      const response = await fetch("/api/restriction-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issuer_id: issuerId,
          restriction_type: templateData.code,
          restriction_name: templateData.name,
          description: templateData.legend,
          is_active: templateData.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const newTemplate = await response.json();

      // ⚡ Invalidate TanStack Query cache to refetch fresh data
      await invalidateAll();

      setShowAddTemplate(false);
      console.log("✅ Template created successfully:", newTemplate);
    } catch (error) {
      console.error("❌ Error creating restriction template:", error);
      alert(`Failed to create template: ${error.message}`);
    }
  };

  const updateRestrictionTemplate = async (templateId, templateData) => {
    try {
      const response = await fetch("/api/restriction-templates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: templateId,
          issuer_id: issuerId,
          restriction_type: templateData.code,
          restriction_name: templateData.name,
          description: templateData.legend,
          is_active: templateData.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const updatedTemplate = await response.json();

      // ⚡ Invalidate TanStack Query cache to refetch fresh data
      await invalidateAll();

      setShowEditTemplate(false);
      setEditingTemplate(null);

      console.log("✅ Template updated successfully:", updatedTemplate);
    } catch (error) {
      console.error("❌ Error updating restriction template:", error);
      alert(`Failed to update template: ${error.message}`);
    }
  };

  const createShareRestriction = async (restrictionData) => {
    try {
      const response = await fetch("/api/share-restrictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...restrictionData,
          issuer_id: issuerId,
        }),
      });

      if (response.ok) {
        // ⚡ Invalidate TanStack Query cache to refetch fresh data
        await invalidateRestrictions();
        setShowAddShareRestriction(false);
      }
    } catch (error) {
      console.error("Error creating share restriction:", error);
    }
  };

  // ⚡ FETCH SHAREHOLDER POSITIONS: Get current share balances
  const fetchShareholderPositions = async (shareholderId) => {
    if (!shareholderId || !issuerId) return;

    setLoadingPositions(true);
    try {
      const supabase = createClient();

      // Fetch all transactions for this shareholder
      const { data: transactions, error } = await supabase
        .from("transfers_new")
        .select("cusip, transaction_type, share_quantity")
        .eq("issuer_id", issuerId)
        .eq("shareholder_id", shareholderId);

      if (error) throw error;

      // Calculate positions by CUSIP
      const positionsByCusip = {};
      transactions?.forEach((txn) => {
        if (!positionsByCusip[txn.cusip]) {
          positionsByCusip[txn.cusip] = 0;
        }

        const isCredit = !(
          txn.transaction_type === "DWAC Withdrawal" ||
          txn.transaction_type === "Transfer Debit" ||
          txn.transaction_type === "Debit" ||
          txn.transaction_type?.toLowerCase().includes("debit")
        );

        const shareChange = isCredit ? txn.share_quantity : -txn.share_quantity;
        positionsByCusip[txn.cusip] += shareChange;
      });

      // Convert to array with security details
      const positions = Object.entries(positionsByCusip)
        .filter(([cusip, balance]) => balance > 0) // Only show positive balances
        .map(([cusip, balance]) => {
          const security = securities.find((s) => s.cusip === cusip);
          return {
            cusip,
            balance,
            security_name: security?.issue_name || "Unknown",
            security_type: security?.class_name || "",
          };
        });

      setShareholderPositions(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      setShareholderPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  // ⚡ FETCH EXISTING RESTRICTIONS: Get all restrictions for shareholder+CUSIP
  const fetchExistingRestrictions = async (shareholderId, cusip) => {
    if (!shareholderId || !cusip || !issuerId) return;

    try {
      const supabase = createClient();

      // 1. Fetch transaction-based restrictions (from transfers_new)
      const { data: transactionRestrictions, error: txError } = await supabase
        .from("transfers_new")
        .select("restriction_id, share_quantity, transaction_date, transaction_type")
        .eq("issuer_id", issuerId)
        .eq("shareholder_id", shareholderId)
        .eq("cusip", cusip)
        .not("restriction_id", "is", null);

      if (txError) throw txError;

      // 2. Fetch manual restrictions (from transaction_restrictions_new)
      const { data: manualRestrictions, error: manualError } = await supabase
        .from("transaction_restrictions_new")
        .select("restriction_id, restricted_shares, restriction_date")
        .eq("issuer_id", issuerId)
        .eq("shareholder_id", shareholderId)
        .eq("cusip", cusip);

      if (manualError) throw manualError;

      // 3. Group by restriction_id and count total shares
      const restrictionMap = {};

      // Add transaction-based restrictions
      transactionRestrictions?.forEach((txn) => {
        if (!restrictionMap[txn.restriction_id]) {
          restrictionMap[txn.restriction_id] = {
            restriction_id: txn.restriction_id,
            shares: 0,
            source: [],
          };
        }

        const isCredit = !(
          txn.transaction_type === "DWAC Withdrawal" ||
          txn.transaction_type === "Transfer Debit" ||
          txn.transaction_type === "Debit" ||
          txn.transaction_type?.toLowerCase().includes("debit")
        );

        const shareChange = isCredit ? txn.share_quantity : -txn.share_quantity;
        restrictionMap[txn.restriction_id].shares += shareChange;
        restrictionMap[txn.restriction_id].source.push({
          type: "transaction",
          date: txn.transaction_date,
          shares: shareChange,
        });
      });

      // Add manual restrictions
      manualRestrictions?.forEach((manual) => {
        if (!restrictionMap[manual.restriction_id]) {
          restrictionMap[manual.restriction_id] = {
            restriction_id: manual.restriction_id,
            shares: 0,
            source: [],
          };
        }
        restrictionMap[manual.restriction_id].shares += manual.restricted_shares;
        restrictionMap[manual.restriction_id].source.push({
          type: "manual",
          date: manual.restriction_date,
          shares: manual.restricted_shares,
        });
      });

      // 4. Enrich with template details
      const restrictions = Object.values(restrictionMap)
        .filter((r) => r.shares > 0) // Only show positive balances
        .map((r) => {
          const template = restrictionTemplates.find((t) => t.id === r.restriction_id);
          return {
            ...r,
            restriction_type: template?.restriction_type || "Unknown",
            restriction_name: template?.restriction_name || template?.restriction_type,
            description: template?.description,
          };
        });

      setExistingRestrictions(restrictions);
    } catch (error) {
      console.error("Error fetching existing restrictions:", error);
      setExistingRestrictions([]);
    }
  };

  const createShareholderRestriction = async (restrictionData) => {
    try {
      console.log("Creating shareholder restriction:", restrictionData);

      const response = await fetch("/api/shareholder-restrictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...restrictionData,
          issuer_id: issuerId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Restriction created successfully:", result);
        // ⚡ Invalidate TanStack Query cache to refetch fresh data
        await invalidateRestrictions();
        setShowAddShareholderRestriction(false);
        // Reset form states
        setSelectedShareholderForRestriction(null);
        setSelectedCusipForRestriction(null);
        setShareholderPositions([]);
        setExistingRestrictions([]);
      } else {
        console.error("Error creating restriction:", result);
        alert(`Error: ${result.error || 'Failed to create restriction'}`);
      }
    } catch (error) {
      console.error("Error creating shareholder restriction:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Helper function to get user name from user ID
  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      return user.email?.split("@")[0] || "Unknown";
    }
    return "Unknown";
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

  // Permission checks using AuthContext
  // Suspended issuers are fully read-only, pending issuers can still edit restrictions (data setup)
  const canEditRestrictions = (canEdit || isAdmin()) && !isIssuerSuspended();
  const canView =
    userRole === "superadmin" ||
    userRole === "admin" ||
    userRole === "transfer_team";

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
              {/* Suspended Issuer Warning */}
              {isIssuerSuspended() && (
                <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive">This issuer is suspended</p>
                    <p className="text-sm text-destructive/80">Restrictions are in read-only mode. No modifications can be made.</p>
                  </div>
                </div>
              )}

              {/* Page Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      Restrictions Management
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Manage restriction templates and apply restrictions to
                      shareholders
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {canEditRestrictions && (
                      <>
                        <Button
                          className="bg-primary text-white hover:bg-primary/90 shadow-sm"
                          onClick={() => setShowAddTemplate(true)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Add Template
                        </Button>

                        <Button
                          className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
                          onClick={() => setShowAddShareholderRestriction(true)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Apply Restriction
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-muted/30 border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Restriction Templates
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {restrictionTemplates.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Share Restrictions
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {shareRestrictions.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Applied Restrictions
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {combinedRestrictions.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {shareholderRestrictions.length} manual + {combinedRestrictions.length - shareholderRestrictions.length} from transactions
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Transaction-Based
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {
                          combinedRestrictions.filter(
                            (r) => r.source === 'transaction',
                          ).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied during processing
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Tabs */}
              <Tabs defaultValue="templates" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates">
                    Restriction Templates
                  </TabsTrigger>
                  <TabsTrigger value="applied-restrictions">
                    Applied Restrictions
                  </TabsTrigger>
                </TabsList>

                {/* Restriction Templates Tab */}
                <TabsContent value="templates" className="space-y-6">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-5 w-5" />
                          Restriction Templates
                        </div>
                        {canEditRestrictions && (
                          <Button
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setShowAddTemplate(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Template
                          </Button>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Master restriction definitions that can be applied to
                        shareholders
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pageLoading ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading templates...</p>
                          </div>
                        </div>
                      ) : restrictionTemplates.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center">
                            <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              No restriction templates found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              Create your first restriction template to get
                              started
                            </p>
                            {canEditRestrictions && (
                              <Button
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => setShowAddTemplate(true)}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Template
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">
                                Code
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Legend Name
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Status
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(restrictionTemplates || []).map((template) => (
                              <TableRow key={template.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {template.restriction_type}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {template.restriction_name || '-'}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <Badge
                                    className={
                                      template.is_active
                                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                        : "bg-muted text-muted-foreground"
                                    }
                                    variant={template.is_active ? "outline" : "secondary"}
                                  >
                                    {template.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    {(userRole === "superadmin" || userRole === "admin") && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-input hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                          setEditingTemplate(template);
                                          setShowEditTemplate(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-input hover:bg-accent hover:text-accent-foreground"
                                      onClick={() => {
                                        setSelectedRestriction(template);
                                        setShowViewRestriction(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Applied Restrictions Tab */}
                <TabsContent value="applied-restrictions" className="space-y-6">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="mr-2 h-5 w-5" />
                          Applied Restrictions
                        </div>
                        {canEditRestrictions && (
                          <Button
                            className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
                            onClick={() =>
                              setShowAddShareholderRestriction(true)
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Apply Restriction
                          </Button>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Restrictions currently applied to shareholders
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pageLoading ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading restrictions...</p>
                          </div>
                        </div>
                      ) : combinedRestrictions.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center">
                            <Users className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              No applied restrictions found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              Apply restrictions to shareholders or process transactions with restrictions
                            </p>
                            {canEditRestrictions && (
                              <Button
                                className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
                                onClick={() =>
                                  setShowAddShareholderRestriction(true)
                                }
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Apply Restriction
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">
                                Shareholder
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                CUSIP
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Restriction
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Restricted Shares
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Source
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Applied Date
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(combinedRestrictions || []).map(
                              (restriction) => {
                                const shareholder = shareholders.find(
                                  (sh) => sh.id === restriction.shareholder_id,
                                );
                                const restrictionTemplate = restrictionTemplates.find(
                                  (rt) => rt.id === restriction.restriction_id,
                                );

                                return (
                                  <TableRow key={restriction.id}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                      {shareholder ? `${shareholder.first_name || ''} ${shareholder.last_name || ''}`.trim() : "Unknown"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {restriction.cusip}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {restrictionTemplate?.restriction_type || restrictionTemplate?.restriction_name ||
                                        "Unknown"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {restriction.restricted_shares?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <Badge
                                        className={
                                          restriction.source === 'manual'
                                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                            : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                        }
                                        variant="outline"
                                      >
                                        {restriction.source_label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                      {restriction.restriction_date
                                        ? new Date(restriction.restriction_date).toLocaleDateString()
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-input hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                          // Merge restriction data with template details
                                          const fullRestrictionData = {
                                            ...restriction,
                                            restriction_type: restrictionTemplate?.restriction_type || restriction.restriction_type,
                                            restriction_name: restrictionTemplate?.restriction_name || restriction.restriction_name,
                                            description: restrictionTemplate?.description || restriction.description,
                                          };
                                          setSelectedRestriction(fullRestrictionData);
                                          setShowViewRestriction(true);
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              },
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      {/* Add Restriction Template Modal */}
      <Dialog open={showAddTemplate} onOpenChange={setShowAddTemplate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Add Restriction Template
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Create a new restriction template that can be applied to
                  shareholders
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createRestrictionTemplate({
                code: formData.get("code"),
                name: formData.get("name"),
                legend: formData.get("legend"),
                is_active: formData.get("is_active") === "on",
              });
            }}
          >
            <div className="space-y-6">
              <div>
                <Label
                  htmlFor="code"
                  className="text-sm font-medium text-foreground"
                >
                  Restriction Code
                </Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., A, B, 144A"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Restriction Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Rule 144, Rule 144A"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label
                  htmlFor="legend"
                  className="text-sm font-medium text-foreground"
                >
                  Restriction Legend
                </Label>
                <Textarea
                  id="legend"
                  name="legend"
                  placeholder="Enter the full restriction legend text (this is the restriction description)"
                  className="mt-1"
                  rows={8}
                  required
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  This is the complete restriction text that will be applied to
                  shareholders
                </p>
              </div>
              <div>
                <Label
                  htmlFor="is_active"
                  className="text-sm font-medium text-foreground"
                >
                  Status
                </Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Switch id="is_active" name="is_active" defaultChecked />
                  <Label htmlFor="is_active" className="text-sm text-muted-foreground">
                    Active
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTemplate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Restriction Template Modal */}
      <Dialog open={showEditTemplate} onOpenChange={setShowEditTemplate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Edit Restriction Template
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Update the restriction template details
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editingTemplate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                updateRestrictionTemplate(editingTemplate.id, {
                  code: formData.get("code"),
                  name: formData.get("name"),
                  legend: formData.get("legend"),
                  is_active: formData.get("is_active") === "on",
                });
              }}
            >
              <div className="space-y-6">
                <div>
                  <Label
                    htmlFor="edit-code"
                    className="text-sm font-medium text-foreground"
                  >
                    Restriction Code
                  </Label>
                  <Input
                    id="edit-code"
                    name="code"
                    defaultValue={editingTemplate.restriction_type}
                    placeholder="e.g., A, B, 144A"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label
                    htmlFor="edit-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Restriction Name
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingTemplate.restriction_name}
                    placeholder="e.g., Rule 144, Rule 144A"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label
                    htmlFor="edit-legend"
                    className="text-sm font-medium text-foreground"
                  >
                    Restriction Legend
                  </Label>
                  <Textarea
                    id="edit-legend"
                    name="legend"
                    defaultValue={editingTemplate.description}
                    placeholder="Enter the full restriction legend text (this is the restriction description)"
                    className="mt-1"
                    rows={8}
                    required
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    This is the complete restriction text that will be applied to
                    shareholders
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="edit-is_active"
                    className="text-sm font-medium text-foreground"
                  >
                    Status
                  </Label>
                  <div className="mt-1 flex items-center space-x-2">
                    <Switch
                      id="edit-is_active"
                      name="is_active"
                      defaultChecked={editingTemplate.is_active}
                    />
                    <Label htmlFor="edit-is_active" className="text-sm text-muted-foreground">
                      Active
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditTemplate(false);
                    setEditingTemplate(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Update Template
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddShareholderRestriction}
        onOpenChange={(open) => {
          setShowAddShareholderRestriction(open);
          if (!open) {
            // Reset states when closing
            setSelectedShareholderForRestriction(null);
            setSelectedCusipForRestriction(null);
            setShareholderPositions([]);
            setExistingRestrictions([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Apply Restriction to Shareholder
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Apply a restriction to a specific shareholder and security
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);

              const restrictedShares = parseInt(formData.get("restricted_shares"));
              const currentBalance = shareholderPositions.find(
                (p) => p.cusip === selectedCusipForRestriction
              )?.balance || 0;

              // Validate restricted shares don't exceed balance
              if (restrictedShares > currentBalance) {
                alert(`Cannot restrict ${restrictedShares.toLocaleString()} shares. Shareholder only owns ${currentBalance.toLocaleString()} shares.`);
                return;
              }

              const restrictionData = {
                shareholder_id: selectedShareholderForRestriction,
                restriction_id: formData.get("restriction_id"),
                cusip: selectedCusipForRestriction,
                restricted_shares: restrictedShares,
              };

              createShareholderRestriction(restrictionData);
            }}
          >
            <div className="space-y-6">
              {/* Shareholder Selection */}
              <div>
                <Label
                  htmlFor="shareholder_id"
                  className="text-sm font-medium text-foreground"
                >
                  Select Shareholder
                </Label>
                <Select
                  name="shareholder_id"
                  value={selectedShareholderForRestriction || ""}
                  onValueChange={(value) => {
                    setSelectedShareholderForRestriction(value);
                    setSelectedCusipForRestriction(null);
                    fetchShareholderPositions(value);
                  }}
                  required
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select shareholder" />
                  </SelectTrigger>
                  <SelectContent>
                    {(shareholders || []).map((shareholder) => (
                      <SelectItem key={shareholder.id} value={shareholder.id}>
                        {shareholder.account_number} - {[shareholder.first_name, shareholder.last_name].filter(Boolean).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show positions if shareholder selected */}
              {selectedShareholderForRestriction && (
                <>
                  {loadingPositions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  ) : shareholderPositions.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        This shareholder has no active positions
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Position Summary */}
                      <div className="p-4 bg-muted/50 border border-border rounded-md">
                        <h4 className="text-sm font-medium text-foreground mb-2">
                          Shareholder Positions
                        </h4>
                        <div className="space-y-2">
                          {shareholderPositions.map((position) => (
                            <div
                              key={position.cusip}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-muted-foreground">
                                {position.cusip} - {position.security_name}
                              </span>
                              <span className="font-semibold text-foreground">
                                {position.balance.toLocaleString()} shares
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CUSIP Selection */}
                      <div>
                        <Label
                          htmlFor="cusip"
                          className="text-sm font-medium text-foreground"
                        >
                          Select Security to Restrict
                        </Label>
                        <Select
                          name="cusip"
                          value={selectedCusipForRestriction || ""}
                          onValueChange={(value) => {
                            setSelectedCusipForRestriction(value);
                            fetchExistingRestrictions(selectedShareholderForRestriction, value);
                          }}
                          required
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select CUSIP" />
                          </SelectTrigger>
                          <SelectContent>
                            {shareholderPositions.map((position) => (
                              <SelectItem key={position.cusip} value={position.cusip}>
                                {position.cusip} - {position.security_name} ({position.balance.toLocaleString()} shares)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Show Existing Restrictions */}
                      {selectedCusipForRestriction && existingRestrictions.length > 0 && (
                        <div className="p-4 bg-muted/30 border border-border rounded-md">
                          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                            <Lock className="h-4 w-4 mr-2" />
                            Current Restrictions on This Security
                          </h4>
                          <div className="space-y-2">
                            {existingRestrictions.map((restriction, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-sm bg-background p-2 rounded border border-border"
                              >
                                <div>
                                  <span className="font-semibold text-foreground">
                                    {restriction.restriction_type}
                                  </span>
                                  {restriction.restriction_name && restriction.restriction_name !== restriction.restriction_type && (
                                    <span className="text-muted-foreground ml-1">
                                      - {restriction.restriction_name}
                                    </span>
                                  )}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {restriction.source.map((s, i) => (
                                      <span key={i}>
                                        {s.shares.toLocaleString()} shares from {s.type}
                                        {i < restriction.source.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <span className="font-semibold text-foreground">
                                  {restriction.shares.toLocaleString()} shares
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 You can add additional restriction types to these shares (they will stack)
                          </p>
                        </div>
                      )}

                      {/* Restriction Type */}
                      <div>
                        <Label
                          htmlFor="restriction_id"
                          className="text-sm font-medium text-foreground"
                        >
                          Restriction Type
                        </Label>
                        <Select name="restriction_id" required>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select restriction" />
                          </SelectTrigger>
                          <SelectContent>
                            {(restrictionTemplates || [])
                              .filter(t => t.is_active)
                              .filter(t => !existingRestrictions.some(er => er.restriction_id === t.id)) // Exclude already applied
                              .map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.restriction_type} - {template.restriction_name || template.description?.substring(0, 50)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedCusipForRestriction && existingRestrictions.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            ⚠️ Restrictions already applied to these shares are hidden from the list
                          </p>
                        )}
                      </div>

                      {/* Restricted Shares Input */}
                      {selectedCusipForRestriction && (
                        <div>
                          <Label
                            htmlFor="restricted_shares"
                            className="text-sm font-medium text-foreground"
                          >
                            Number of Shares to Restrict
                          </Label>
                          <div className="mt-1 space-y-2">
                            <Input
                              id="restricted_shares"
                              name="restricted_shares"
                              type="number"
                              min="1"
                              max={shareholderPositions.find((p) => p.cusip === selectedCusipForRestriction)?.balance || 0}
                              placeholder={`Max: ${shareholderPositions.find((p) => p.cusip === selectedCusipForRestriction)?.balance.toLocaleString() || 0}`}
                              className="mt-1"
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Available: {shareholderPositions.find((p) => p.cusip === selectedCusipForRestriction)?.balance.toLocaleString() || 0} shares
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddShareholderRestriction(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
              >
                Apply Restriction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Restriction Modal */}
      <Dialog open={showViewRestriction} onOpenChange={setShowViewRestriction}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  {selectedRestriction?.source ? 'Applied Restriction Details' : 'Restriction Template'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedRestriction?.source
                    ? 'Details about this applied restriction'
                    : 'Template definition and legal text'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedRestriction && (
            <div className="space-y-6">
              {/* Applied Restriction Details (if it has source field) */}
              {selectedRestriction.source && (
                <>
                  {/* Source Badge */}
                  <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Source
                      </Label>
                      <Badge
                        className={`mt-1 ${selectedRestriction.source === 'manual'
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                          }`}
                        variant="outline"
                      >
                        {selectedRestriction.source_label || selectedRestriction.source}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Applied Date
                      </Label>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {selectedRestriction.restriction_date
                          ? new Date(selectedRestriction.restriction_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Shareholder & Security Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 border border-border rounded-lg">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Shareholder
                      </Label>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {(() => {
                          const shareholder = shareholders.find(s => s.id === selectedRestriction.shareholder_id)
                          return shareholder
                            ? `${shareholder.first_name || ''} ${shareholder.last_name || ''}`.trim()
                            : 'Unknown'
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Account: {(() => {
                          const shareholder = shareholders.find(s => s.id === selectedRestriction.shareholder_id)
                          return shareholder?.account_number || '-'
                        })()}
                      </p>
                    </div>

                    <div className="p-4 bg-muted/30 border border-border rounded-lg">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Security
                      </Label>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {selectedRestriction.cusip || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const security = securities.find(s => s.cusip === selectedRestriction.cusip)
                          return security?.issue_name || 'Unknown Security'
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Restricted Shares */}
                  <div className="p-4 bg-muted/30 border border-border rounded-lg">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Restricted Shares
                    </Label>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {(selectedRestriction.restricted_shares || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      shares under restriction
                    </p>
                  </div>

                  {/* Transaction Reference (if from transaction) */}
                  {selectedRestriction.transaction_id && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                      <p className="text-xs text-green-700">
                        <strong>Transaction Reference:</strong> {selectedRestriction.transaction_id}
                      </p>
                    </div>
                  )}

                  {/* Notes (if manual) */}
                  {selectedRestriction.notes && (
                    <div>
                      <Label className="text-sm font-medium text-foreground">
                        Notes
                      </Label>
                      <p className="mt-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-border">
                        {selectedRestriction.notes}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Restriction Template Info */}
              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  Restriction Type Information
                </h3>

                <div className="space-y-4">
                  {/* Restriction Code */}
                  <div className="flex items-start gap-4">
                    <div className="w-20 px-3 py-2 bg-primary text-primary-foreground font-bold text-center rounded-md shadow-md">
                      {selectedRestriction.restriction_type || 'N/A'}
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-foreground">
                        Restriction Code
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedRestriction.restriction_name || selectedRestriction.restriction_type || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Legal Description */}
                  <div>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Legal Description / Legend Text
                    </Label>
                    <div className="mt-2 p-4 bg-muted/50 border border-border rounded-md">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedRestriction.description || 'No description available'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      This is the exact text that appears on stock certificates and statements
                    </p>
                  </div>

                  {/* Status (only for templates) */}
                  {selectedRestriction.is_active !== undefined && (
                    <div>
                      <Label className="text-sm font-medium text-foreground">
                        Template Status
                      </Label>
                      <div className="mt-2">
                        <Badge
                          className={
                            selectedRestriction.is_active
                              ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                              : "bg-muted text-muted-foreground"
                          }
                          variant={selectedRestriction.is_active ? "outline" : "secondary"}
                        >
                          {selectedRestriction.is_active ? "✓ Active" : "✗ Inactive"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedRestriction.is_active
                            ? 'Available for use in transactions and manual application'
                            : 'Cannot be used for new restrictions'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowViewRestriction(false)}
              className="border-input hover:bg-accent hover:text-accent-foreground"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
