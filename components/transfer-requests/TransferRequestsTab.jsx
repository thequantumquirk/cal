"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Search, Filter, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import NewRequestForm from "./NewRequestForm";
import RequestDetailView from "./RequestDetailView";
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

export default function TransferRequestsTab({ issuerId, issuerName, userRole }) {
  const [view, setView] = useState("list"); // list, new, detail
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const isBroker = userRole === "broker";

  useEffect(() => {
    fetchRequests();
  }, [issuerId]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transfer-requests?issuerId=${issuerId}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.request_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.shareholder_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const handleNewRequest = () => {
    setView("new");
  };

  const handleRequestSuccess = (newRequest) => {
    setRequests([newRequest, ...requests]);
    setView("detail");
    setSelectedRequest(newRequest);
  };

  const handleViewDetail = async (requestId) => {
    try {
      const res = await fetch(`/api/transfer-requests?requestId=${requestId}`);
      if (!res.ok) throw new Error("Failed to fetch request");
      const data = await res.json();
      setSelectedRequest(data);
      setView("detail");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load request details");
    }
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedRequest(null);
    fetchRequests(); // Refresh list
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return toUSDate(dateString);
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

  // New Request Form View
  if (view === "new") {
    return (
      <NewRequestForm
        issuerId={issuerId}
        issuerName={issuerName}
        onSuccess={handleRequestSuccess}
        onCancel={handleBackToList}
      />
    );
  }

  // Request Detail View
  if (view === "detail" && selectedRequest) {
    return (
      <RequestDetailView
        request={selectedRequest}
        userRole={userRole}
        onBack={handleBackToList}
        onUpdate={fetchRequests}
      />
    );
  }

  // List View
  return (
    <div>
      {/* Header with Actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Transfer Agent Requests</h3>
          <p className="text-sm text-muted-foreground">Submit and track transfer agent requests</p>
        </div>
        {isBroker && (
          <Button onClick={handleNewRequest} className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Pending", "Under Review", "Completed", "Rejected"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {requests.length === 0 ? "No requests yet" : "No requests found"}
          </h3>
          <p className="text-gray-500 mb-4">
            {requests.length === 0
              ? "Submit your first transfer agent request to get started"
              : "Try adjusting your search or filter criteria"}
          </p>
          {isBroker && requests.length === 0 && (
            <Button onClick={handleNewRequest} className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Create First Request
            </Button>
          )}
        </div>
      ) : (
        /* Requests Table */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Shareholder</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow
                key={request.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewDetail(request.id)}
              >
                <TableCell className="font-medium">{request.request_number}</TableCell>
                <TableCell>{request.request_type}</TableCell>
                <TableCell>{request.shareholder_name}</TableCell>
                <TableCell>{Number(request.quantity).toLocaleString()} {request.security_type}</TableCell>
                <TableCell>{formatDate(request.submitted_at)}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
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

      {/* Summary Stats */}
      {!loading && requests.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{requests.length}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">
              {requests.filter(r => r.status === "Pending" || r.status === "Under Review").length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-800">
              {requests.filter(r => r.status === "Completed").length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">
              {requests.filter(r => r.status === "Processing" || r.status === "Approved").length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
        </div>
      )}
    </div>
  );
}
