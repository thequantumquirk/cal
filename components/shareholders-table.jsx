"use client";

import { useState, memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  ArrowUpDown,
  Users,
  Hash,
  Calendar,
  BarChart3,
  AlertTriangle,
  Eye,
  Building,
  Shield,
  Mail,
  Loader2,
} from "lucide-react";
import ShareholderModal from "./shareholder-modal";
import { toUSDate } from "@/lib/dateUtils";
import EmptyState from "./empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function ShareholdersTable({
  shareholders,
  userRole,
  issuerId,
  securities = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("first_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShareholder, setSelectedShareholder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareholderToDelete, setShareholderToDelete] = useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedShareholderForView, setSelectedShareholderForView] =
    useState(null);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState("existing");
  const [selectedShareholderToInvite, setSelectedShareholderToInvite] = useState("");
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteName, setNewInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const itemsPerPage = 10;
  const router = useRouter();

  // Helper function to format shareholder name
  const getShareholderName = (shareholder) => {
    // For entities (broker/dealer, corporation) or when first_name is empty,
    // just use last_name which contains the full entity name
    if (!shareholder.first_name || shareholder.first_name.trim() === "") {
      return shareholder.last_name || shareholder.name || "-";
    }
    // For individuals, combine first and last name
    return `${shareholder.first_name} ${shareholder.last_name || ""}`.trim();
  };

  // Helper function to get security names from security IDs
  const getSecurityNames = (securityIds) => {
    if (!securityIds || securityIds.length === 0) return "-";
    const names = securityIds
      .map((id) => {
        const security = securities.find((s) => s.id === id);
        return security ? security.class_name : null;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "-";
  };

  // Helper function to get badge color based on security type
  const getSecurityBadgeColor = (securityName) => {
    if (!securityName) return "bg-gray-100 text-gray-800";

    const name = securityName.toLowerCase();

    // Class A/B Ordinary Stock - Blue (primary, stable)
    if (name.includes("class a") || name.includes("class b")) {
      if (name.includes("ordinary")) {
        return "bg-blue-100 text-blue-800";
      }
    }

    // Warrants & Rights - Orange/Amber (derivative, speculative)
    if (name.includes("warrant") || name.includes("right")) {
      return "bg-orange-100 text-orange-800";
    }

    // Preferred Stock - Purple (premium, priority)
    if (name.includes("preferred")) {
      return "bg-purple-100 text-purple-800";
    }

    // Units - Green (bundled, combined)
    if (name.includes("unit")) {
      return "bg-green-100 text-green-800";
    }

    // Depository/DTC - Gray (custodial)
    if (name.includes("depository") || name.includes("dtc")) {
      return "bg-gray-100 text-gray-800";
    }

    // Default - Blue
    return "bg-blue-100 text-blue-800";
  };

  // NEW: Expand shareholders into individual position rows
  const expandShareholdersToPositions = useMemo(() => {
    const positions = [];

    shareholders.forEach((shareholder) => {
      // If shareholder has no securities, still show them with a single row
      if (!shareholder.security_ids || shareholder.security_ids.length === 0) {
        positions.push({
          ...shareholder,
          position_security_id: null,
          position_security_name: "-",
          position_shares: 0,
          is_first_row: true,
          rowspan: 1,
        });
      } else {
        // Create a row for each security they own
        shareholder.security_ids.forEach((securityId, index) => {
          const security = securities.find((s) => s.id === securityId);

          // Get shares for this specific security from positionMap (we'll need to pass this)
          // For now, we'll calculate it based on total shares divided by securities
          // TODO: This needs actual per-security share counts
          const positionShares = shareholder.position_shares?.[securityId] || 0;

          positions.push({
            ...shareholder,
            position_security_id: securityId,
            position_security_name: security ? security.class_name : "-",
            position_shares: positionShares,
            is_first_row: index === 0,
            rowspan: shareholder.security_ids.length,
          });
        });
      }
    });

    return positions;
  }, [shareholders, securities]);

  // Filter position rows based on search term
  const filteredPositions = expandShareholdersToPositions.filter((position) => {
    const fullName = getShareholderName(position).toLowerCase();

    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      (position.account_number || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (position.holder_type || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (position.position_security_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  // Sort position rows
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    let aValue, bValue;

    if (sortField === "name") {
      // Handle name sorting specially using helper function
      aValue = getShareholderName(a);
      bValue = getShareholderName(b);
    } else if (sortField === "security") {
      aValue = a.position_security_name || "";
      bValue = b.position_security_name || "";
    } else if (sortField === "shares") {
      aValue = a.position_shares || 0;
      bValue = b.position_shares || 0;
    }
    // COMMENTED OUT - discussing calculation formula
    // else if (sortField === "ownership_percentage") {
    //   // Handle ownership percentage sorting with calculated values
    //   aValue = parseFloat(
    //     a.calculated_ownership_percentage || a.ownership_percentage || 0,
    //   );
    //   bValue = parseFloat(
    //     b.calculated_ownership_percentage || b.ownership_percentage || 0,
    //   );
    // }
    else {
      aValue = a[sortField];
      bValue = b[sortField];
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Paginate position rows
  const totalPages = Math.ceil(sortedPositions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPositions = sortedPositions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleEdit = (shareholder) => {
    setSelectedShareholder(shareholder);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedShareholder(null);
    setIsModalOpen(true);
  };

  const handleViewDetails = (shareholder) => {
    setSelectedShareholderForView(shareholder);
    setViewDetailsOpen(true);
  };

  const handleDeleteClick = (shareholder) => {
    setShareholderToDelete(shareholder);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!shareholderToDelete) return;

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("shareholders_new")
        .delete()
        .eq("id", shareholderToDelete.id);

      if (error) throw error;

      router.refresh();
      setDeleteDialogOpen(false);
      setShareholderToDelete(null);
    } catch (error) {
      console.error("Error deleting shareholder:", error);
      setErrorMessage("Error deleting shareholder: " + error.message);
      setErrorDialogOpen(true);
    }
  };

  const canEdit = userRole === "admin" || userRole === "transfer_team";
  const canDelete = userRole === "admin";
  const canCreate = userRole === "admin";
  const canInvite = userRole === "admin" || userRole === "superadmin" || userRole === "transfer_team";

  // Get shareholders that can be invited (have email, no user_id)
  const invitableShareholders = useMemo(() => {
    return shareholders.filter(s => s.email && !s.user_id);
  }, [shareholders]);

  // Handle sending invitation
  const handleSendInvite = async () => {
    setInviting(true);
    try {
      let payload = { issuer_id: issuerId };

      if (inviteTab === "existing") {
        if (!selectedShareholderToInvite) {
          toast.error("Please select a shareholder to invite");
          setInviting(false);
          return;
        }
        payload.shareholder_id = selectedShareholderToInvite;
      } else {
        if (!newInviteEmail) {
          toast.error("Please enter an email address");
          setInviting(false);
          return;
        }
        payload.email = newInviteEmail;
        payload.name = newInviteName || newInviteEmail.split("@")[0];
      }

      const res = await fetch("/api/shareholders/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(data.message || "Invitation sent successfully!");
      setInviteModalOpen(false);
      resetInviteForm();
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const resetInviteForm = () => {
    setInviteTab("existing");
    setSelectedShareholderToInvite("");
    setNewInviteEmail("");
    setNewInviteName("");
  };

  // Handle invite for a specific shareholder row
  const handleInviteShareholder = async (shareholder) => {
    if (!shareholder.email) {
      toast.error("This shareholder does not have an email address");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/shareholders/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareholder_id: shareholder.id,
          issuer_id: issuerId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${shareholder.email}`);
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Add Button */}
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, account number, or holder type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {canInvite && (
            <Button
              onClick={() => setInviteModalOpen(true)}
              variant="outline"
            >
              <Mail className="h-4 w-4 mr-2" />
              Invite Shareholder
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={handleAdd}
              className="bg-wealth-gradient !text-black font-semibold border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Shareholder
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-glass overflow-hidden">
        <div className="overflow-x-auto table-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead
                  className="cursor-pointer hover:bg-muted transition-colors font-semibold text-foreground"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center space-x-2">
                    <span>Name</span>
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Account
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Holder Type
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted transition-colors font-semibold text-foreground"
                  onClick={() => handleSort("security")}
                >
                  <div className="flex items-center space-x-2">
                    <span>Security</span>
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted transition-colors font-semibold text-foreground text-right"
                  onClick={() => handleSort("shares")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Shares</span>
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right w-32">
                  Total Shares
                </TableHead>
                {/* COMMENTED OUT - discussing calculation formula */}
                {/* <TableHead
                  className="cursor-pointer hover:bg-white/50 transition-colors font-semibold text-gray-900"
                  onClick={() => handleSort("ownership_percentage")}
                >
                  <div className="flex items-center space-x-2">
                    <span>Ownership %</span>
                  </div>
                </TableHead> */}
                <TableHead className="font-semibold text-foreground w-24">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPositions.map((position, index) => {
                // Check if this is the start of a new shareholder group
                const prevPosition = index > 0 ? paginatedPositions[index - 1] : null;
                const isNewGroup = !prevPosition || prevPosition.id !== position.id;
                const isLastInGroup = index === paginatedPositions.length - 1 ||
                  (paginatedPositions[index + 1] && paginatedPositions[index + 1].id !== position.id);

                return (
                  <TableRow
                    key={`${position.id}-${position.position_security_id || 'no-sec'}`}
                    className={`hover:bg-muted/50 transition-colors ${isNewGroup ? 'border-t-2 border-border' : ''
                      } ${isLastInGroup ? 'border-b-2 border-border/60' : ''}`}
                  >
                    {/* Name - show dimmed for non-first rows */}
                    <TableCell className={position.is_first_row ? "font-semibold text-foreground" : "text-muted-foreground text-sm"}>
                      {position.is_first_row ? getShareholderName(position) : '↳'}
                    </TableCell>

                    {/* Account */}
                    <TableCell className={position.is_first_row ? "text-foreground" : "text-muted-foreground text-sm"}>
                      {position.is_first_row ? (position.account_number || "-") : ''}
                    </TableCell>

                    {/* Holder Type */}
                    <TableCell className={position.is_first_row ? "text-foreground" : "text-muted-foreground text-sm"}>
                      {position.is_first_row ? (position.holder_type || "-") : ''}
                    </TableCell>

                    {/* Security - show for each position */}
                    <TableCell className="text-foreground">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityBadgeColor(position.position_security_name)}`}>
                        {position.position_security_name}
                      </span>
                    </TableCell>

                    {/* Shares for this security */}
                    <TableCell className="font-medium text-foreground text-right">
                      {position.position_shares?.toLocaleString() || "0"}
                    </TableCell>

                    {/* Total Shares - show for every row */}
                    <TableCell className={`text-right w-32 ${position.is_first_row ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {position.is_first_row ? position.current_shares?.toLocaleString() || "0" : ''}
                    </TableCell>

                    {/* COMMENTED OUT - discussing calculation formula */}
                    {/* Ownership % - show for every row */}
                    {/* <TableCell className={position.is_first_row ? 'font-bold text-gray-900' : 'text-gray-500'}>
                      {position.is_first_row ? (
                        position.calculated_ownership_percentage
                          ? `${position.calculated_ownership_percentage}%`
                          : position.ownership_percentage
                            ? `${position.ownership_percentage}%`
                            : "0.00%"
                      ) : ''}
                    </TableCell> */}

                    {/* Actions - show for every row */}
                    <TableCell className="w-32">
                      {position.is_first_row && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/issuer/${issuerId}/shareholder/${position.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Invite button - show if shareholder has email but no user_id */}
                          {canInvite && position.email && !position.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInviteShareholder(position)}
                              disabled={inviting}
                              title="Send invitation email"
                            >
                              {inviting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(position)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(position)}
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Empty State */}
        {paginatedPositions.length === 0 && (
          <EmptyState
            icon={Users}
            title="No Shareholders Found"
            description={
              searchTerm
                ? "No shareholders match your search criteria. Try adjusting your search."
                : "No shareholders have been added yet. Add your first shareholder to get started."
            }
            actionText="Add Shareholder"
            actionIcon={Plus}
            onAction={handleAdd}
            showAction={canCreate && !searchTerm}
            secondaryActionText={searchTerm ? "Clear Search" : undefined}
            secondaryOnAction={searchTerm ? () => setSearchTerm("") : undefined}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium text-muted-foreground">
            Showing <span className="text-foreground font-semibold">{startIndex + 1}</span> to{" "}
            <span className="text-foreground font-semibold">{Math.min(startIndex + itemsPerPage, sortedPositions.length)}</span> of{" "}
            <span className="text-foreground font-semibold">{sortedPositions.length}</span> positions
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-border/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </Button>
            <span className="flex items-center px-3 py-2 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="border-border/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <ShareholderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shareholder={selectedShareholder}
        userRole={userRole}
        issuerId={issuerId}
      />

      {/* View Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Shareholder Details
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  View detailed information for{" "}
                  {selectedShareholderForView?.name}
                </p>
              </div>
            </div>
          </DialogHeader>

          {selectedShareholderForView && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <p className="text-foreground font-medium">
                      {selectedShareholderForView.first_name &&
                        `${selectedShareholderForView.first_name} `}
                      {selectedShareholderForView.last_name &&
                        ` ${selectedShareholderForView.last_name}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Account Number
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.account_number || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Taxpayer ID
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.taxpayer_id ||
                        selectedShareholderForView.tax_id ||
                        "-"}
                    </p>
                  </div>
                  {/* COMMENTED OUT - discussing calculation formula */}
                  {/* <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Ownership Percentage
                    </Label>
                    <p className="text-gray-900 font-semibold">
                      {selectedShareholderForView.calculated_ownership_percentage
                        ? `${selectedShareholderForView.calculated_ownership_percentage}%`
                        : selectedShareholderForView.ownership_percentage
                          ? `${selectedShareholderForView.ownership_percentage}%`
                          : "0.00%"}
                    </p>
                  </div> */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Current Shares
                    </Label>
                    <p className="text-foreground font-semibold">
                      {selectedShareholderForView.current_shares
                        ? selectedShareholderForView.current_shares.toLocaleString()
                        : "0"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Address
                  </Label>
                  <p className="text-foreground">
                    {selectedShareholderForView.address
                      ? `${selectedShareholderForView.address}, ${selectedShareholderForView.city || ""}, ${selectedShareholderForView.state || ""} ${selectedShareholderForView.ZIP || ""}, ${selectedShareholderForView.country || ""}`
                        .replace(/,\s*,/g, ",")
                        .replace(/,\s*$/, "")
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  Additional Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      LEI
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.lei || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Holder Type
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.holder_type || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      TIN Status
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.tin_status || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      OFAC Results
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.ofac_results || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      OFAC Date
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.ofac_date
                        ? toUSDate(selectedShareholderForView.ofac_date)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.dob
                        ? toUSDate(selectedShareholderForView.dob)
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Email
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </Label>
                    <p className="text-foreground">
                      {selectedShareholderForView.phone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-destructive rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-foreground">
                  Delete Shareholder
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this shareholder? This action
                  cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Delete Shareholder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-destructive rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-foreground">
                  Error
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {errorMessage}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogAction
              onClick={() => setErrorDialogOpen(false)}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Shareholder Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={(open) => {
        setInviteModalOpen(open);
        if (!open) resetInviteForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Invite Shareholder
                </DialogTitle>
                <DialogDescription>
                  Send an invitation to a shareholder to set up their account
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={inviteTab} onValueChange={setInviteTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing Shareholder</TabsTrigger>
              <TabsTrigger value="new">New Shareholder</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="mt-4 space-y-4">
              {invitableShareholders.length > 0 ? (
                <div className="space-y-2">
                  <Label>Select Shareholder</Label>
                  <Select
                    value={selectedShareholderToInvite}
                    onValueChange={setSelectedShareholderToInvite}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shareholder to invite" />
                    </SelectTrigger>
                    <SelectContent>
                      {invitableShareholders.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {getShareholderName(s)} - {s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only shareholders with email addresses and no linked account are shown
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No shareholders available to invite</p>
                  <p className="text-xs mt-1">All shareholders either have no email or already have an account</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="new" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address *</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="shareholder@example.com"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteName">Name (Optional)</Label>
                <Input
                  id="inviteName"
                  type="text"
                  placeholder="John Doe"
                  value={newInviteName}
                  onChange={(e) => setNewInviteName(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The shareholder will receive an email to set up their account
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setInviteModalOpen(false);
                resetInviteForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={inviting || (inviteTab === "existing" ? !selectedShareholderToInvite : !newInviteEmail)}
            >
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(ShareholdersTable);
