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
  Building2,
  Hash,
  Search,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  FileText,
  Loader2,
  RefreshCw,
  UserPlus,
  Mail,
  Send
} from "lucide-react";
import { toast } from "sonner";

export default function BrokerProfilesSection({ defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [profiles, setProfiles] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [brokerStats, setBrokerStats] = useState({});
  const [loadingStats, setLoadingStats] = useState({});

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (isOpen && profiles.length === 0 && pendingInvites.length === 0) {
      fetchBrokerProfiles();
      fetchPendingInvites();
    }
  }, [isOpen]);

  const fetchBrokerProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/broker-profiles");
      if (!res.ok) throw new Error("Failed to fetch broker profiles");
      const data = await res.json();
      setProfiles(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load broker profiles");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      // Get broker role ID first
      const res = await fetch("/api/admin/broker-profiles/pending-invites");
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
    }
  };

  const fetchBrokerStats = async (userId) => {
    if (brokerStats[userId]) return;

    setLoadingStats(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/broker-profiles/${userId}/stats`);
      if (res.ok) {
        const stats = await res.json();
        setBrokerStats(prev => ({ ...prev, [userId]: stats }));
      }
    } catch (error) {
      console.error("Failed to fetch broker stats:", error);
    } finally {
      setLoadingStats(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleViewDetails = (profile) => {
    setSelectedProfile(profile);
    setDetailsOpen(true);
    fetchBrokerStats(profile.user_id);
  };

  const handleInviteBroker = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/admin/broker-profiles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || inviteEmail.split("@")[0]
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      fetchPendingInvites(); // Refresh pending invites
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
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

  // Accepted = users who have signed up (in profiles)
  const acceptedCount = profiles.length;
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
                    <Building2 className="w-5 h-5 text-primary" />
                    Manage Brokers
                  </CardTitle>
                  <CardDescription>
                    {acceptedCount + pendingCount} broker{acceptedCount + pendingCount !== 1 ? "s" : ""} ({acceptedCount} active, {pendingCount} pending)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setInviteOpen(true)}
                  className="bg-wealth-gradient text-black hover:opacity-90"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Broker
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
                <div className="text-2xl font-bold">{acceptedCount + pendingCount}</div>
                <div className="text-sm text-muted-foreground">Total Brokers</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{acceptedCount}</div>
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
                  fetchBrokerProfiles();
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
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {profiles.length === 0 && pendingInvites.length === 0 ? "No brokers yet" : "No matching brokers found"}
                </p>
                {profiles.length === 0 && pendingInvites.length === 0 && (
                  <Button onClick={() => setInviteOpen(true)} className="bg-wealth-gradient text-black">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite First Broker
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broker</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited / Joined</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Pending Invites first */}
                  {filteredPendingInvites.map((invite) => (
                    <TableRow key={`invite-${invite.email}`}>
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
                        Invited {formatDate(invite.invited_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">Awaiting signup</span>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Active Brokers */}
                  {filteredProfiles.map((profile) => (
                    <TableRow
                      key={profile.id || profile.user_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(profile)}
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
                      <TableCell className="text-sm text-muted-foreground">
                        Joined {formatDate(profile.user?.created_at || profile.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Invite Broker Dialog - No issuer selection needed */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite Broker
            </DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new broker. Brokers have access to all active issuers.
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
                  placeholder="broker@company.com"
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

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Brokers can access and submit requests for all active issuers in the system.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteBroker}
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
              <Building2 className="w-5 h-5 text-primary" />
              Broker Details
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
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    Contact
                  </div>
                  <p className="font-medium">
                    {selectedProfile.user?.name || "Not set"}
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="w-4 h-4" />
                    Issuer Access
                  </div>
                  <p className="font-medium text-green-600">
                    All Active Issuers
                  </p>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Request Activity
                </h4>
                {loadingStats[selectedProfile.user_id] ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading stats...
                  </div>
                ) : brokerStats[selectedProfile.user_id] ? (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-xl font-bold">
                        {brokerStats[selectedProfile.user_id].total}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                        {brokerStats[selectedProfile.user_id].pending}
                      </div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xl font-bold text-green-700 dark:text-green-400">
                        {brokerStats[selectedProfile.user_id].completed}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-xl font-bold text-red-700 dark:text-red-400">
                        {brokerStats[selectedProfile.user_id].rejected}
                      </div>
                      <div className="text-xs text-muted-foreground">Rejected</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined: {formatDate(selectedProfile.user?.created_at || selectedProfile.created_at)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
