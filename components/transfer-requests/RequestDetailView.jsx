"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  User,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { toUSDate } from "@/lib/dateUtils";

const STATUS_CONFIG = {
  "Pending": { color: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground", icon: Clock },
  "Under Review": { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: AlertCircle },
  "Approved": { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: CheckCircle2 },
  "Processing": { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Clock },
  "Completed": { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  "Rejected": { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  "More Info Needed": { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: AlertCircle }
};

export default function RequestDetailView({ request: initialRequest, userRole, onBack, onUpdate }) {
  const [request, setRequest] = useState(initialRequest);
  const [documents, setDocuments] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const isBroker = userRole === "broker";
  const isAdmin = ["admin", "superadmin", "transfer_team"].includes(userRole);

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

          setCommunications(prev => [...prev, newComm]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [request.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);

      // Fetch documents
      const docsRes = await fetch(`/api/transfer-requests/documents?requestId=${request.id}`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }

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

      const newComm = await res.json();
      setCommunications([...communications, newComm]);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${step.completed ? "bg-green-500 text-white" : "bg-muted dark:bg-muted text-muted-foreground"
                      }`}
                  >
                    {step.completed ? <CheckCircle2 className="w-6 h-6" /> : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${step.completed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(step.date)}</div>
                  </div>
                </div>
                {index < getStatusTimeline().length - 1 && (
                  <div className={`h-1 flex-1 ${step.completed ? "bg-green-500" : "bg-muted dark:bg-muted"}`} />
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
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">Request Type:</span>
                  <p className="mt-1">{request.request_type}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Request Date:</span>
                  <p className="mt-1">{formatDate(request.submitted_at)}</p>
                </div>
                {request.request_purpose && (
                  <div>
                    <span className="font-medium text-foreground">Purpose:</span>
                    <p className="mt-1">{request.request_purpose}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Priority:</span>
                  <div className="mt-1">
                    <Badge variant={request.priority === "High" || request.priority === "Urgent" ? "destructive" : "secondary"}>
                      {request.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-foreground">Shareholder:</span>
                  <p className="mt-1">{request.shareholder_name}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Account Number:</span>
                  <p className="mt-1">{request.account_number}</p>
                </div>
                {request.dtc_number && (
                  <div>
                    <span className="font-medium text-foreground">DTC Number:</span>
                    <p className="mt-1">{request.dtc_number}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Security Type:</span>
                  <p className="mt-1">{request.security_type}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Quantity:</span>
                  <p className="mt-1">{Number(request.quantity).toLocaleString()}</p>
                </div>
                {request.cusip && (
                  <div>
                    <span className="font-medium text-foreground">CUSIP:</span>
                    <p className="mt-1">{request.cusip}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Requested Date:</span>
                  <p className="mt-1">{formatDate(request.requested_completion_date)}</p>
                </div>
              </div>
              {request.special_instructions && (
                <div className="mt-4 pt-4 border-t">
                  <span className="font-medium text-foreground">Special Instructions:</span>
                  <p className="mt-1 text-muted-foreground">{request.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No documents uploaded
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.document_type}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.document_name} • {formatFileSize(doc.file_size)}
                          </div>
                          {doc.is_required && (
                            <Badge variant="secondary" className="mt-1 text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, "_blank")}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communications */}
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {communications.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No messages yet
                      </div>
                    ) : (
                      communications.map((comm) => (
                        <div key={comm.id} className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium text-sm">
                                {comm.user?.name || comm.user?.email || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(comm.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-foreground">{comm.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="pt-4 border-t">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or question..."
                      rows={3}
                    />
                    <Button
                      onClick={handleSendComment}
                      disabled={sending || !newComment.trim()}
                      className="mt-2"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? "Sending..." : "Send Comment"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-6">
          {/* Broker Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Broker Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{request.broker?.name || request.broker?.email || "Unknown"}</div>
                    {request.broker?.email && <div className="text-xs text-muted-foreground">{request.broker.email}</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned To (Admin View) */}
          {isAdmin && request.assigned_to && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{request.assigned_user?.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      Assigned {formatDate(request.assigned_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => window.print()}>
                  <FileText className="w-4 h-4 mr-2" />
                  Print Request
                </Button>
                {isAdmin && request.status === "Pending" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Admin can start review - to be implemented
                      toast.info("Review functionality coming soon");
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Start Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
