"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Briefcase,
  Loader2,
  RefreshCw,
  UserPlus,
  Mail,
  Send,
  Building2,
  Plus,
  Link2,
  Settings,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function ShareholderProfilesSection({ defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [profiles, setProfiles] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shareholderStats, setShareholderStats] = useState({});
  const [loadingStats, setLoadingStats] = useState({});

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteIssuerId, setInviteIssuerId] = useState("");
  const [inviteUnlinkedShareholders, setInviteUnlinkedShareholders] = useState([]);
  const [inviteSelectedHoldings, setInviteSelectedHoldings] = useState([]);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [loadingInviteUnlinked, setLoadingInviteUnlinked] = useState(false);

  // Add Holding modal state (for existing users)
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [issuers, setIssuers] = useState([]);
  const [selectedIssuerId, setSelectedIssuerId] = useState("");
  const [unlinkedShareholders, setUnlinkedShareholders] = useState([]);
  const [holdingSearchTerm, setHoldingSearchTerm] = useState("");
  const [loadingIssuers, setLoadingIssuers] = useState(false);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [linking, setLinking] = useState(false);

  // Manage Holdings modal state (for per-row holdings management)
  const [manageHoldingsOpen, setManageHoldingsOpen] = useState(false);
  const [manageHoldingsProfile, setManageHoldingsProfile] = useState(null);
  const [manageHoldingsLoading, setManageHoldingsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profiles.length === 0 && pendingInvites.length === 0) {
      fetchShareholderProfiles();
      fetchPendingInvites();
    }
  }, [isOpen]);

  const fetchShareholderProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/shareholder-profiles");
      const data = await res.json();

      if (!res.ok) {
        console.error("API error:", data);
        throw new Error(data.error || "Failed to fetch shareholder profiles");
      }

      setProfiles(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(error.message || "Failed to load shareholder profiles");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const res = await fetch("/api/admin/shareholder-profiles/pending-invites");
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
    }
  };

  const fetchShareholderStats = async (userId) => {
    if (shareholderStats[userId]) return;

    setLoadingStats(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/shareholder-profiles/${userId}/stats`);
      if (res.ok) {
        const stats = await res.json();
        setShareholderStats(prev => ({ ...prev, [userId]: stats }));
      }
    } catch (error) {
      console.error("Failed to fetch shareholder stats:", error);
    } finally {
      setLoadingStats(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleViewDetails = (profile) => {
    setSelectedProfile(profile);
    setDetailsOpen(true);
    fetchShareholderStats(profile.user_id);
  };

  const handleInviteShareholder = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/shareholders/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || inviteEmail.split("@")[0],
          holdings: inviteSelectedHoldings.length > 0 ? inviteSelectedHoldings : undefined
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      const result = await res.json();
      const holdingsMsg = result.linkedHoldings?.length > 0
        ? ` with ${result.linkedHoldings.length} holding(s) assigned`
        : "";
      toast.success(`Invitation sent to ${inviteEmail}${holdingsMsg}`);
      resetInviteModal();
      fetchPendingInvites();
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  // Reset invite modal state
  const resetInviteModal = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteIssuerId("");
    setInviteUnlinkedShareholders([]);
    setInviteSelectedHoldings([]);
    setInviteSearchTerm("");
  };

  // Fetch all shareholders for invite modal (not just unlinked)
  const fetchInviteShareholders = async (issuerId, search = "") => {
    setLoadingInviteUnlinked(true);
    try {
      let url = `/api/admin/shareholder-profiles/link-holding?issuer_id=${issuerId}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInviteUnlinkedShareholders(data || []);
      } else {
        console.error("Failed to fetch shareholders:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch shareholders:", error);
    } finally {
      setLoadingInviteUnlinked(false);
    }
  };

  // Handle issuer change in invite modal
  const handleInviteIssuerChange = (issuerId) => {
    setInviteIssuerId(issuerId);
    setInviteSearchTerm("");
    setInviteSelectedHoldings([]);
    if (issuerId) {
      fetchInviteShareholders(issuerId);
    } else {
      setInviteUnlinkedShareholders([]);
    }
  };

  // Handle search in invite modal
  const handleInviteHoldingSearch = () => {
    if (inviteIssuerId) {
      fetchInviteShareholders(inviteIssuerId, inviteSearchTerm);
    }
  };

  // Toggle holding selection in invite modal
  const toggleInviteHoldingSelection = (holdingId) => {
    setInviteSelectedHoldings(prev => {
      if (prev.includes(holdingId)) {
        return prev.filter(id => id !== holdingId);
      } else {
        return [...prev, holdingId];
      }
    });
  };

  // Fetch issuers for the Add Holding dropdown
  const fetchIssuers = async () => {
    if (issuers.length > 0) return;

    setLoadingIssuers(true);
    try {
      const res = await fetch("/api/issuers");
      if (res.ok) {
        const data = await res.json();
        setIssuers(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch issuers:", error);
    } finally {
      setLoadingIssuers(false);
    }
  };

  // Fetch shareholders for an issuer (excludes those already linked to current user)
  const fetchShareholdersForLinking = async (issuerId, search = "") => {
    if (!selectedProfile) return;

    setLoadingUnlinked(true);
    try {
      let url = `/api/admin/shareholder-profiles/link-holding?issuer_id=${issuerId}&exclude_user_id=${selectedProfile.user_id}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUnlinkedShareholders(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch shareholders:", error);
    } finally {
      setLoadingUnlinked(false);
    }
  };

  // Handle issuer selection change
  const handleIssuerChange = (issuerId) => {
    setSelectedIssuerId(issuerId);
    setHoldingSearchTerm("");
    if (issuerId) {
      fetchShareholdersForLinking(issuerId);
    } else {
      setUnlinkedShareholders([]);
    }
  };

  // Handle holding search
  const handleHoldingSearch = () => {
    if (selectedIssuerId) {
      fetchShareholdersForLinking(selectedIssuerId, holdingSearchTerm);
    }
  };

  // Open Add Holding modal
  const handleOpenAddHolding = () => {
    setAddHoldingOpen(true);
    fetchIssuers();
  };

  // Link a shareholder to the current user
  const handleLinkShareholder = async (shareholderId) => {
    if (!selectedProfile) return;

    setLinking(true);
    try {
      const res = await fetch("/api/admin/shareholder-profiles/link-holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareholder_id: shareholderId,
          user_id: selectedProfile.user_id,
          user_email: selectedProfile.user?.email
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to link holding");
      }

      const result = await res.json();
      toast.success(`Linked ${result.shareholder.first_name} ${result.shareholder.last_name} holding successfully`);

      // Refresh data
      setAddHoldingOpen(false);
      setSelectedIssuerId("");
      setUnlinkedShareholders([]);
      setHoldingSearchTerm("");

      // Clear cached stats to force refresh
      setShareholderStats(prev => {
        const newStats = { ...prev };
        delete newStats[selectedProfile.user_id];
        return newStats;
      });

      // Refresh the stats
      fetchShareholderStats(selectedProfile.user_id);
      fetchShareholderProfiles();
    } catch (error) {
      console.error("Link error:", error);
      toast.error(error.message || "Failed to link holding");
    } finally {
      setLinking(false);
    }
  };

  // === Manage Holdings Functions ===

  // Open Manage Holdings modal for a specific profile
  const handleManageHoldings = (profile) => {
    setManageHoldingsProfile(profile);
    setManageHoldingsOpen(true);
    setSelectedIssuerId("");
    setUnlinkedShareholders([]);
    setHoldingSearchTerm("");
    fetchIssuers();
    fetchShareholderStats(profile.user_id);
  };

  // Unlink a holding from a user
  const handleUnlinkHolding = async (shareholderId) => {
    if (!manageHoldingsProfile) return;

    setManageHoldingsLoading(true);
    try {
      const res = await fetch("/api/admin/shareholder-profiles/unlink-holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareholder_id: shareholderId })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove holding");
      }

      toast.success("Holding removed successfully");

      // Clear cached stats to force refresh
      setShareholderStats(prev => {
        const newStats = { ...prev };
        delete newStats[manageHoldingsProfile.user_id];
        return newStats;
      });

      // Refresh stats and profiles
      fetchShareholderStats(manageHoldingsProfile.user_id);
      fetchShareholderProfiles();
    } catch (error) {
      console.error("Unlink error:", error);
      toast.error(error.message || "Failed to remove holding");
    } finally {
      setManageHoldingsLoading(false);
    }
  };

  // Link shareholder in manage holdings context
  const handleLinkShareholderInManage = async (shareholderId) => {
    if (!manageHoldingsProfile) return;

    setLinking(true);
    try {
      const res = await fetch("/api/admin/shareholder-profiles/link-holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareholder_id: shareholderId,
          user_id: manageHoldingsProfile.user_id,
          user_email: manageHoldingsProfile.user?.email
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add holding");
      }

      toast.success("Holding added successfully");

      // Refresh
      setSelectedIssuerId("");
      setUnlinkedShareholders([]);
      setHoldingSearchTerm("");

      // Clear cached stats to force refresh
      setShareholderStats(prev => {
        const newStats = { ...prev };
        delete newStats[manageHoldingsProfile.user_id];
        return newStats;
      });

      fetchShareholderStats(manageHoldingsProfile.user_id);
      fetchShareholderProfiles();
    } catch (error) {
      console.error("Link error:", error);
      toast.error(error.message || "Failed to add holding");
    } finally {
      setLinking(false);
    }
  };

  // Fetch shareholders for manage holdings modal
  const fetchShareholdersForManage = async (issuerId, search = "") => {
    if (!manageHoldingsProfile) return;

    setLoadingUnlinked(true);
    try {
      let url = `/api/admin/shareholder-profiles/link-holding?issuer_id=${issuerId}&exclude_user_id=${manageHoldingsProfile.user_id}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUnlinkedShareholders(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch shareholders:", error);
    } finally {
      setLoadingUnlinked(false);
    }
  };

  // Handle issuer change in manage holdings
  const handleManageIssuerChange = (issuerId) => {
    setSelectedIssuerId(issuerId);
    setHoldingSearchTerm("");
    if (issuerId) {
      fetchShareholdersForManage(issuerId);
    } else {
      setUnlinkedShareholders([]);
    }
  };

  // Handle search in manage holdings
  const handleManageHoldingSearch = () => {
    if (selectedIssuerId) {
      fetchShareholdersForManage(selectedIssuerId, holdingSearchTerm);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      profile.user?.email?.toLowerCase().includes(term) ||
      profile.user?.name?.toLowerCase().includes(term)
    );
  });

  const filteredPendingInvites = pendingInvites.filter(invite => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      invite.email?.toLowerCase().includes(term) ||
      invite.name?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatNumber = (num) => {
    if (!num) return "0";
    return Number(num).toLocaleString();
  };

  // Active = users who have signed up (in profiles)
  const activeCount = profiles.length;
  // Pending = invited but not yet signed up
  const pendingCount = pendingInvites.length;

  return (
    <Card className="mt-8">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Manage Shareholders
                  </CardTitle>
                  <CardDescription>
                    {activeCount + pendingCount} shareholder{activeCount + pendingCount !== 1 ? "s" : ""} ({activeCount} active, {pendingCount} pending)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setInviteOpen(true);
                    fetchIssuers();
                  }}
                  className="bg-wealth-gradient text-black hover:opacity-90"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Shareholder
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{activeCount + pendingCount}</div>
                <div className="text-sm text-muted-foreground">Total Shareholders</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{activeCount}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Pending Invite</div>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  fetchShareholderProfiles();
                  fetchPendingInvites();
                }}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredProfiles.length === 0 && filteredPendingInvites.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {profiles.length === 0 && pendingInvites.length === 0 ? "No shareholders with accounts yet" : "No matching shareholders found"}
                </p>
                {profiles.length === 0 && pendingInvites.length === 0 && (
                  <Button onClick={() => setInviteOpen(true)} className="bg-wealth-gradient text-black">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite First Shareholder
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shareholder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Holdings</TableHead>
                    <TableHead>Invited / Joined</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Pending Invites first */}
                  {filteredPendingInvites.map((invite) => (
                    <TableRow key={`invite-${invite.id || invite.email}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invite.name || "Not set"}</p>
                          <p className="text-sm text-muted-foreground">{invite.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Invite
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.issuers_new?.issuer_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Invited {formatDate(invite.invited_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">Awaiting signup</span>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Active Shareholders */}
                  {filteredProfiles.map((profile) => (
                    <TableRow
                      key={profile.id || profile.user_id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {profile.user?.name || "Not set"}
                          </p>
                          <p className="text-sm text-muted-foreground">{profile.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {profile.holdings?.length || 0} issuer{(profile.holdings?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Joined {formatDate(profile.user?.created_at || profile.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManageHoldings(profile);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Holdings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(profile)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Invite Shareholder Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite Shareholder
            </DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new shareholder to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="inviteEmail">Email Address *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="shareholder@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="inviteName">Name (Optional)</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="inviteName"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Smith"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Optional Holdings Assignment Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Assign Holdings (Optional)</Label>
              </div>

              {/* Issuer Selection */}
              <div className="mb-3">
                <Select
                  value={inviteIssuerId}
                  onValueChange={handleInviteIssuerChange}
                  disabled={loadingIssuers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingIssuers ? "Loading issuers..." : "Select issuer to assign holdings"} />
                  </SelectTrigger>
                  <SelectContent>
                    {issuers.map((issuer) => (
                      <SelectItem key={issuer.id} value={issuer.id}>
                        {issuer.issuer_name || issuer.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search and holdings list */}
              {inviteIssuerId && (
                <>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search by name or account..."
                        value={inviteSearchTerm}
                        onChange={(e) => setInviteSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInviteHoldingSearch()}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleInviteHoldingSearch}
                      disabled={loadingInviteUnlinked}
                    >
                      {loadingInviteUnlinked ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {loadingInviteUnlinked ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : inviteUnlinkedShareholders.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No shareholders found for this issuer</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {inviteUnlinkedShareholders.map((sh) => (
                          <div
                            key={sh.id}
                            className={`p-2 flex items-center gap-2 hover:bg-muted/50 cursor-pointer ${
                              inviteSelectedHoldings.includes(sh.id) ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => toggleInviteHoldingSelection(sh.id)}
                          >
                            <Checkbox
                              checked={inviteSelectedHoldings.includes(sh.id)}
                              onCheckedChange={() => toggleInviteHoldingSelection(sh.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {sh.first_name} {sh.last_name}
                                </p>
                                {sh.user_id && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0">
                                    Linked
                                  </Badge>
                                )}
                                {sh.email && !sh.user_id && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 shrink-0">
                                    Has Email
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                Account: {sh.account_number || "N/A"}
                                {sh.email && ` | ${sh.email}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {inviteSelectedHoldings.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {inviteSelectedHoldings.length} holding{inviteSelectedHoldings.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> The shareholder will receive an invitation email and can set up their account to view their holdings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetInviteModal} disabled={inviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteShareholder}
              disabled={inviting || !inviteEmail}
              className="bg-wealth-gradient text-black hover:opacity-90"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Shareholder Details
            </DialogTitle>
          </DialogHeader>

          {selectedProfile && (
            <div className="space-y-6 mt-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedProfile.user?.name || "Unnamed"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProfile.user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={selectedProfile.onboarding_completed
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"}>
                    {selectedProfile.onboarding_completed ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Onboarding Complete
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Onboarding Pending
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              {/* Holdings Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="w-4 h-4" />
                    Issuers
                  </div>
                  <p className="text-2xl font-bold">
                    {shareholderStats[selectedProfile.user_id]?.total_issuers || selectedProfile.holdings?.length || 0}
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Briefcase className="w-4 h-4" />
                    Total Shares
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(shareholderStats[selectedProfile.user_id]?.total_shares || 0)}
                  </p>
                </div>
              </div>

              {/* Holdings List */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Holdings by Issuer
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddHolding}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Holding
                  </Button>
                </div>
                {loadingStats[selectedProfile.user_id] ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading holdings...
                  </div>
                ) : shareholderStats[selectedProfile.user_id]?.holdings?.length > 0 ? (
                  <div className="space-y-3">
                    {shareholderStats[selectedProfile.user_id].holdings.map((holding, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{holding.issuer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Account: {holding.account_number || "N/A"} | {holding.first_name} {holding.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatNumber(holding.shares)}</p>
                          <p className="text-xs text-muted-foreground">shares</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedProfile.holdings?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedProfile.holdings.map((holding, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{holding.issuer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Account: {holding.account_number || "N/A"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No holdings found</p>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined: {formatDate(selectedProfile.user?.created_at || selectedProfile.created_at)}
                </div>
                {selectedProfile.onboarding_completed_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Onboarding: {formatDate(selectedProfile.onboarding_completed_at)}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Holding Dialog */}
      <Dialog open={addHoldingOpen} onOpenChange={setAddHoldingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Add Holding
            </DialogTitle>
            <DialogDescription>
              Assign any shareholder record (like Cede & Co, etc.) to {selectedProfile?.user?.email}.
              This will give them access to view that holding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Issuer Selection */}
            <div>
              <Label>Select Issuer</Label>
              <Select
                value={selectedIssuerId}
                onValueChange={handleIssuerChange}
                disabled={loadingIssuers}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingIssuers ? "Loading issuers..." : "Select an issuer"} />
                </SelectTrigger>
                <SelectContent>
                  {issuers.map((issuer) => (
                    <SelectItem key={issuer.id} value={issuer.id}>
                      {issuer.issuer_name || issuer.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search within issuer */}
            {selectedIssuerId && (
              <div>
                <Label>Search Shareholder</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by name, account number, or email..."
                      value={holdingSearchTerm}
                      onChange={(e) => setHoldingSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleHoldingSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleHoldingSearch}
                    disabled={loadingUnlinked}
                  >
                    {loadingUnlinked ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Unlinked Shareholders List */}
            {selectedIssuerId && (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {loadingUnlinked ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : unlinkedShareholders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No shareholders found</p>
                    <p className="text-xs mt-1">All shareholders in this issuer are already linked to this user</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {unlinkedShareholders.map((sh) => (
                      <div
                        key={sh.id}
                        className="p-3 flex items-center justify-between hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {sh.first_name} {sh.last_name}
                            </p>
                            {sh.user_id && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Linked to another user
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Account: {sh.account_number || "N/A"}
                            {sh.email && ` | ${sh.email}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkShareholder(sh.id)}
                          disabled={linking}
                        >
                          {linking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-1" />
                              {sh.user_id ? "Reassign" : "Link"}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedIssuerId && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select an issuer to view all shareholder records
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddHoldingOpen(false);
                setSelectedIssuerId("");
                setUnlinkedShareholders([]);
                setHoldingSearchTerm("");
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Holdings Dialog */}
      <Dialog open={manageHoldingsOpen} onOpenChange={setManageHoldingsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Manage Holdings
            </DialogTitle>
            <DialogDescription>
              Add or remove holdings for {manageHoldingsProfile?.user?.name || manageHoldingsProfile?.user?.email || "this shareholder"}.
            </DialogDescription>
          </DialogHeader>

          {manageHoldingsProfile && (
            <div className="space-y-6 py-4">
              {/* Current Holdings Section */}
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4" />
                  Current Holdings
                </h4>
                {loadingStats[manageHoldingsProfile.user_id] ? (
                  <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading holdings...
                  </div>
                ) : shareholderStats[manageHoldingsProfile.user_id]?.holdings?.length > 0 ? (
                  <div className="space-y-2 border rounded-lg divide-y">
                    {shareholderStats[manageHoldingsProfile.user_id].holdings.map((holding) => (
                      <div key={holding.shareholder_id} className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{holding.issuer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Account: {holding.account_number || "N/A"} | {holding.first_name} {holding.last_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <p className="font-bold">{formatNumber(holding.shares)}</p>
                            <p className="text-xs text-muted-foreground">shares</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleUnlinkHolding(holding.shareholder_id)}
                            disabled={manageHoldingsLoading}
                          >
                            {manageHoldingsLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">No holdings assigned yet</p>
                  </div>
                )}
              </div>

              {/* Add New Holding Section */}
              <div className="border-t pt-6">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4" />
                  Add New Holding
                </h4>

                {/* Issuer Selection */}
                <div className="mb-4">
                  <Label>Select Issuer</Label>
                  <Select
                    value={selectedIssuerId}
                    onValueChange={handleManageIssuerChange}
                    disabled={loadingIssuers}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loadingIssuers ? "Loading issuers..." : "Select an issuer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {issuers.map((issuer) => (
                        <SelectItem key={issuer.id} value={issuer.id}>
                          {issuer.issuer_name || issuer.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search within issuer */}
                {selectedIssuerId && (
                  <div className="mb-4">
                    <Label>Search Shareholder</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by name, account number, or email..."
                          value={holdingSearchTerm}
                          onChange={(e) => setHoldingSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleManageHoldingSearch()}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleManageHoldingSearch}
                        disabled={loadingUnlinked}
                      >
                        {loadingUnlinked ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Available Shareholders List */}
                {selectedIssuerId && (
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {loadingUnlinked ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : unlinkedShareholders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No available shareholders found</p>
                        <p className="text-xs mt-1">All shareholders in this issuer are already linked to this user</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {unlinkedShareholders.map((sh) => (
                          <div
                            key={sh.id}
                            className="p-3 flex items-center justify-between hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {sh.first_name} {sh.last_name}
                                </p>
                                {sh.user_id && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                    Linked to another user
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Account: {sh.account_number || "N/A"}
                                {sh.email && ` | ${sh.email}`}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleLinkShareholderInManage(sh.id)}
                              disabled={linking}
                            >
                              {linking ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  {sh.user_id ? "Reassign" : "Add"}
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!selectedIssuerId && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select an issuer to view available shareholder records
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManageHoldingsOpen(false);
                setManageHoldingsProfile(null);
                setSelectedIssuerId("");
                setUnlinkedShareholders([]);
                setHoldingSearchTerm("");
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
