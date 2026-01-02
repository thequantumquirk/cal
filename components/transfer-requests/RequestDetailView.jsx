"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  User,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { toUSDate } from "@/lib/dateUtils";

const STATUS_CONFIG = {
  "Pending": { color: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground", icon: Clock },
  "Under Review": { color: "bg-secondary/30 text-foreground dark:bg-secondary/20 dark:text-secondary border-2 border-secondary/40", icon: AlertCircle },
  "Approved": { color: "bg-primary/20 text-primary dark:bg-primary/10 dark:text-primary border-2 border-primary/40", icon: CheckCircle2 },
  "Processing": { color: "bg-secondary/40 text-foreground dark:bg-secondary/20 dark:text-secondary border-2 border-secondary/50", icon: Clock },
  "Completed": { color: "bg-primary/30 text-primary dark:bg-primary/20 dark:text-primary border-2 border-primary/50 font-semibold", icon: CheckCircle2 },
  "Rejected": { color: "bg-destructive/20 text-destructive dark:bg-destructive/10 dark:text-destructive border-2 border-destructive/40", icon: XCircle },
  "More Info Needed": { color: "bg-secondary/30 text-foreground dark:bg-secondary/20 dark:text-foreground border-2 border-secondary/40", icon: AlertCircle }
};

export default function RequestDetailView({ request: initialRequest, userRole, onBack, onUpdate }) {
  const [request, setRequest] = useState(initialRequest);
  const [communications, setCommunications] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commsExpanded, setCommsExpanded] = useState(false);

  const isBroker = userRole === "broker";
  const isAdmin = ["admin", "superadmin", "transfer_team"].includes(userRole);

  const fetchDetails = async () => {
    try {
      setLoading(true);

      // Fetch communications
      const commsRes = await fetch(`/api/transfer-requests/communications?requestId=${request.id}`);
      if (commsRes.ok) {
        const commsData = await commsRes.json();
        setCommunications(commsData);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Set up realtime subscription for communications
    const supabase = createClient();
    const channel = supabase
      .channel(`request-${request.id}-communications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfer_request_communications',
          filter: `request_id=eq.${request.id}`
        },
        async (payload) => {
          console.log('🔔 New comment received:', payload.new);

          // Fetch user data for the new comment
          const { data: userData } = await supabase
            .from('users_new')
            .select('id, name, email')
            .eq('id', payload.new.user_id)
            .single();

          const newComm = {
            ...payload.new,
            user: userData
          };

          // Check if comment already exists to avoid duplicates
          setCommunications(prev => {
            if (prev.some(c => c.id === newComm.id)) {
              return prev;
            }
            return [...prev, newComm];
          });
        }
      )
      .subscribe();

    return () => {
      // Properly cleanup the channel subscription
      supabase.removeChannel(channel);
    };
  }, [request.id]); // fetchDetails is stable, no need to include in deps

  const handleSendComment = async () => {
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/transfer-requests/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          message: newComment,
          isInternal: false
        })
      });

      if (!res.ok) throw new Error("Failed to send comment");

      // Comment will be added via realtime subscription
      setNewComment("");
      toast.success("Comment sent successfully");
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send comment");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return toUSDate(dateString);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const dateStr = toUSDate(dateString);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes} UTC`;
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
    const StatusIcon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <StatusIcon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getStatusTimeline = () => {
    const steps = [
      { label: "Submitted", date: request.submitted_at, completed: true },
      { label: "Under Review", date: request.review_started_at, completed: !!request.review_started_at },
      { label: request.status === "Rejected" ? "Rejected" : "Approved", date: request.approved_at || request.rejected_at, completed: !!request.approved_at || !!request.rejected_at },
      { label: "Completed", date: request.completed_at, completed: !!request.completed_at }
    ];

    return steps;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Request {request.request_number}</h1>
            <p className="text-muted-foreground mt-1">{request.issuer?.issuer_name || "Unknown Issuer"}</p>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </div>

      {/* Status Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {getStatusTimeline().map((step, index) => (
              <div key={index} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-all ${step.completed
                        ? "bg-wealth-gradient text-black shadow-md"
                        : "bg-muted dark:bg-muted text-muted-foreground"
                      }`}
                  >
                    {step.completed ? <CheckCircle2 className="w-7 h-7" /> : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${step.completed ? "text-primary font-semibold" : "text-muted-foreground"
                      }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(step.date)}</div>
                  </div>
                </div>
                {index < getStatusTimeline().length - 1 && (
                  <div className={`h-2 flex-1 rounded-full transition-all ${step.completed ? "bg-wealth-gradient shadow-sm" : "bg-muted dark:bg-muted"
                    }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Current Status:</strong> {request.status} • Last Updated: {formatDateTime(request.updated_at)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Broker DTC Information */}
          <Card>
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Broker DTC Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">DTC Participant #:</span>
                  <p className="mt-1 font-mono font-bold text-lg">{request.dtc_participant_number || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">DWAC Submitted:</span>
                  <Badge className={`mt-1 ${request.dwac_submitted ? 'bg-green-600' : 'bg-amber-500'}`}>
                    {request.dwac_submitted ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Request Date:</span>
                  <p className="mt-1">{formatDate(request.submitted_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Split Transaction Details */}
          <Card>
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>Split Transaction</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {/* Units - DEBIT */}
              <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge variant="destructive" className="text-xs mb-2">DEBIT</Badge>
                    <p className="font-semibold text-base">Units</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      CUSIP: {request.units_cusip || request.cusip || "N/A"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    -{(request.units_quantity || request.quantity || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Class A - CREDIT */}
              <div className="p-4 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge className="bg-green-600 text-xs mb-2">CREDIT</Badge>
                    <p className="font-semibold text-base">Class A Shares</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      CUSIP: {request.class_a_cusip || "N/A"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    +{(request.class_a_shares_quantity || request.units_quantity || request.quantity || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Warrants/Rights - CREDIT */}
              <div className="p-4 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge className="bg-green-600 text-xs mb-2">CREDIT</Badge>
                    <p className="font-semibold text-base">
                      {request.issuer?.split_security_type === "Right" ? "Rights" : "Warrants"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      CUSIP: {request.warrants_cusip || "N/A"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    +{(request.warrants_rights_quantity || request.units_quantity || request.quantity || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Special Instructions */}
              {request.special_instructions && (
                <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-lg mt-4">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">Special Instructions</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{request.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-6">
          {/* Approve/Reject Actions */}
          {isAdmin && request.status === "Pending" && (
            <Card className="border-2 border-primary/30">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg">Request Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  onClick={() => {
                    const params = new URLSearchParams({
                      requestId: request.id,
                      token: request.action_token
                    });
                    window.location.href = `/broker-action/approve?${params.toString()}`;
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Request
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive font-semibold"
                  onClick={() => {
                    const params = new URLSearchParams({
                      requestId: request.id,
                      token: request.action_token
                    });
                    window.location.href = `/broker-action/reject?${params.toString()}`;
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
                <p className="text-xs text-center text-muted-foreground pt-2 border-t">
                  Review the request details before taking action
                </p>
              </CardContent>
            </Card>
          )}

          {/* Assigned To (Admin View) */}
          {isAdmin && request.assigned_to && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Assigned To
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-wealth-gradient flex items-center justify-center shadow-sm flex-shrink-0">
                    <User className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{request.assigned_user?.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      Assigned {formatDate(request.assigned_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communications - Collapsible */}
          <Card className="border-2 border-border/50">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
              onClick={() => setCommsExpanded(!commsExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Messages ({communications.length})</CardTitle>
                </div>
                {commsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </CardHeader>
            {commsExpanded && (
              <CardContent className="pt-0 pb-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
                      {communications.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No messages yet
                        </div>
                      ) : (
                        communications.map((comm) => (
                          <div key={comm.id} className="p-3 rounded-lg bg-muted/30">
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 rounded-full bg-wealth-gradient flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-black" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-semibold text-xs truncate">
                                    {comm.user?.name || comm.user?.email || "Unknown"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateTime(comm.created_at)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-foreground">{comm.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="pt-3 border-t">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a message..."
                        rows={2}
                        className="text-sm"
                      />
                      <Button
                        onClick={handleSendComment}
                        disabled={sending || !newComment.trim()}
                        size="sm"
                        className="mt-2 w-full bg-wealth-gradient hover:opacity-90 text-black font-semibold disabled:opacity-50"
                      >
                        <Send className="w-3 h-3 mr-2" />
                        {sending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
