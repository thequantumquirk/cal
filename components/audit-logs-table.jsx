"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Eye,
    Search,
    X,
    Activity,
    Download,
    ArrowUpDown,
    Plus,
    Pencil,
    Trash2,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Building,
    FileText,
    Users,
    Briefcase,
    Globe,
    Monitor,
    Calendar,
    Hash,
    ExternalLink,
} from "lucide-react";
import EmptyState from "./empty-state";

// Entity type icons
const ENTITY_ICONS = {
    transaction: FileText,
    shareholder: Users,
    security: Briefcase,
    issuer: Building,
    issuer_user: User,
};

export default function AuditLogsTable({ logs, count, page, limit, issuers, users, stats }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedLog, setSelectedLog] = useState(null);
    const [copiedField, setCopiedField] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Filters state - initialize from URL
    const [actionFilter, setActionFilter] = useState(searchParams.get("action") || "all");
    const [entityFilter, setEntityFilter] = useState(searchParams.get("entity_type") || "all");
    const [issuerFilter, setIssuerFilter] = useState(searchParams.get("issuer_id") || "all");
    const [userFilter, setUserFilter] = useState(searchParams.get("user_id") || "all");
    const [fromDate, setFromDate] = useState(searchParams.get("from") || "");
    const [toDate, setToDate] = useState(searchParams.get("to") || "");
    const [pageSize, setPageSize] = useState(limit.toString());

    // Sorting state
    const [sortField, setSortField] = useState(searchParams.get("sort") || "created_at");
    const [sortDir, setSortDir] = useState(searchParams.get("dir") || "desc");

    const totalPages = Math.ceil(count / limit);

    // Client-side search filtering
    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const term = searchTerm.toLowerCase();
        return logs.filter(log =>
            log.users?.name?.toLowerCase().includes(term) ||
            log.users?.email?.toLowerCase().includes(term) ||
            log.entity_id?.toLowerCase().includes(term) ||
            log.action?.toLowerCase().includes(term) ||
            log.entity_type?.toLowerCase().includes(term) ||
            JSON.stringify(log.details)?.toLowerCase().includes(term)
        );
    }, [logs, searchTerm]);

    // Build URL with current filters
    const buildUrl = (overrides = {}) => {
        const params = new URLSearchParams();

        const filters = {
            action: actionFilter,
            entity_type: entityFilter,
            issuer_id: issuerFilter,
            user_id: userFilter,
            from: fromDate,
            to: toDate,
            sort: sortField,
            dir: sortDir,
            page: page.toString(),
            limit: pageSize,
            ...overrides
        };

        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== "all" && value !== "") {
                params.set(key, value);
            }
        });

        return `/logs?${params.toString()}`;
    };

    const handleFilter = () => {
        router.push(buildUrl({ page: "1" }));
    };

    const clearFilters = () => {
        setActionFilter("all");
        setEntityFilter("all");
        setIssuerFilter("all");
        setUserFilter("all");
        setFromDate("");
        setToDate("");
        setSearchTerm("");
        router.push("/logs");
    };

    const handleSort = (field) => {
        const newDir = sortField === field && sortDir === "desc" ? "asc" : "desc";
        setSortField(field);
        setSortDir(newDir);
        router.push(buildUrl({ sort: field, dir: newDir, page: "1" }));
    };

    const handlePageChange = (newPage) => {
        router.push(buildUrl({ page: newPage.toString() }));
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        router.push(buildUrl({ limit: newSize, page: "1" }));
    };

    // Quick date presets
    const setDatePreset = (preset) => {
        const today = new Date();
        let from = "";

        switch (preset) {
            case "today":
                from = format(today, "yyyy-MM-dd");
                break;
            case "7d":
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                from = format(weekAgo, "yyyy-MM-dd");
                break;
            case "30d":
                const monthAgo = new Date(today);
                monthAgo.setDate(today.getDate() - 30);
                from = format(monthAgo, "yyyy-MM-dd");
                break;
            case "all":
                setFromDate("");
                setToDate("");
                router.push(buildUrl({ from: "", to: "", page: "1" }));
                return;
        }

        setFromDate(from);
        setToDate(format(today, "yyyy-MM-dd"));
        router.push(buildUrl({ from, to: format(today, "yyyy-MM-dd"), page: "1" }));
    };

    // CSV Export
    const handleExport = () => {
        const headers = ["Timestamp", "User", "Email", "Action", "Entity Type", "Entity ID", "Issuer", "IP Address", "Details"];
        const rows = filteredLogs.map(log => [
            format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
            log.users?.name || "Unknown",
            log.users?.email || "",
            log.action,
            log.entity_type,
            log.entity_id,
            log.issuers?.issuer_name || "",
            log.ip_address || "",
            JSON.stringify(log.details || {})
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
        link.click();
    };

    // Copy to clipboard
    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const hasActiveFilters = actionFilter !== "all" || entityFilter !== "all" ||
                             issuerFilter !== "all" || userFilter !== "all" ||
                             fromDate || toDate;

    return (
        <div className="space-y-4">
            {/* Main Card */}
            <div className="bg-card rounded-xl border border-border shadow-sm">
                {/* Search & Quick Filters */}
                <div className="p-4 border-b border-border">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                        {/* Search */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Quick Date Presets & Export */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center rounded-lg border border-border overflow-hidden">
                                <button
                                    onClick={() => setDatePreset("today")}
                                    className={`px-3 py-1.5 text-sm transition-colors ${
                                        fromDate === format(new Date(), "yyyy-MM-dd") && toDate === format(new Date(), "yyyy-MM-dd")
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted"
                                    }`}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setDatePreset("7d")}
                                    className="px-3 py-1.5 text-sm hover:bg-muted transition-colors border-l border-border"
                                >
                                    7 Days
                                </button>
                                <button
                                    onClick={() => setDatePreset("30d")}
                                    className="px-3 py-1.5 text-sm hover:bg-muted transition-colors border-l border-border"
                                >
                                    30 Days
                                </button>
                                <button
                                    onClick={() => setDatePreset("all")}
                                    className={`px-3 py-1.5 text-sm transition-colors border-l border-border ${
                                        !fromDate && !toDate ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                    }`}
                                >
                                    All Time
                                </button>
                            </div>

                            <Button variant="outline" onClick={handleExport} className="gap-2">
                                <Download className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="p-4 border-b border-border bg-muted/30">
                    {/* Row 1: Dropdown Filters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {/* Action Filter */}
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="CREATE_ISSUER">Create Issuer</SelectItem>
                                <SelectItem value="UPDATE_ISSUER">Update Issuer</SelectItem>
                                <SelectItem value="CREATE_TRANSACTION">Create Transaction</SelectItem>
                                <SelectItem value="DELETE_TRANSACTION">Delete Transaction</SelectItem>
                                <SelectItem value="CREATE_SHAREHOLDER">Create Shareholder</SelectItem>
                                <SelectItem value="UPDATE_SHAREHOLDER">Update Shareholder</SelectItem>
                                <SelectItem value="CREATE_SECURITY">Create Security</SelectItem>
                                <SelectItem value="UPDATE_SECURITY">Update Security</SelectItem>
                                <SelectItem value="ADD_USER_TO_ISSUER">Add User to Issuer</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Entity Filter */}
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Entity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entities</SelectItem>
                                <SelectItem value="issuer">Issuer</SelectItem>
                                <SelectItem value="transaction">Transaction</SelectItem>
                                <SelectItem value="shareholder">Shareholder</SelectItem>
                                <SelectItem value="security">Security</SelectItem>
                                <SelectItem value="issuer_user">User Assignment</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* User Filter */}
                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="User" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.name || u.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Issuer Filter */}
                        <Select value={issuerFilter} onValueChange={setIssuerFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Issuer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Issuers</SelectItem>
                                {issuers.map((issuer) => (
                                    <SelectItem key={issuer.id} value={issuer.id}>
                                        {issuer.issuer_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row 2: Date Range & Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-[140px]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-[140px]"
                            />
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                            <Button onClick={handleFilter}>
                                Apply Filters
                            </Button>
                            {hasActiveFilters && (
                                <Button variant="outline" onClick={clearFilters}>
                                    <X className="h-4 w-4 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="relative w-full overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[160px]">
                                    <button
                                        onClick={() => handleSort("created_at")}
                                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                        Timestamp
                                        <ArrowUpDown className={`h-3 w-3 ${sortField === "created_at" ? "text-primary" : "text-muted-foreground"}`} />
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button
                                        onClick={() => handleSort("user_id")}
                                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                        User
                                        <ArrowUpDown className={`h-3 w-3 ${sortField === "user_id" ? "text-primary" : "text-muted-foreground"}`} />
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button
                                        onClick={() => handleSort("action")}
                                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                        Action
                                        <ArrowUpDown className={`h-3 w-3 ${sortField === "action" ? "text-primary" : "text-muted-foreground"}`} />
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button
                                        onClick={() => handleSort("entity_type")}
                                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                        Entity
                                        <ArrowUpDown className={`h-3 w-3 ${sortField === "entity_type" ? "text-primary" : "text-muted-foreground"}`} />
                                    </button>
                                </TableHead>
                                <TableHead>Issuer</TableHead>
                                <TableHead className="text-right w-[100px]">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <EmptyState
                                            icon={Activity}
                                            title="No Audit Logs"
                                            description={
                                                hasActiveFilters || searchTerm
                                                    ? "No logs match your current filters. Try adjusting your filter criteria."
                                                    : "No activity has been recorded yet. Actions will appear here as they occur."
                                            }
                                            actionText="Clear Filters"
                                            onAction={clearFilters}
                                            showAction={hasActiveFilters || !!searchTerm}
                                            size="md"
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-sm text-muted-foreground cursor-default">
                                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {format(new Date(log.created_at), "PPpp")}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-xs font-semibold text-primary">
                                                        {(log.users?.name || "U")[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.users?.name || "Unknown"}</span>
                                                    <span className="text-xs text-muted-foreground">{log.users?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <ActionBadge action={log.action} />
                                        </TableCell>
                                        <TableCell>
                                            <EntityDisplay type={log.entity_type} id={log.entity_id} />
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {log.issuers?.issuer_name || (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t border-border">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            Showing {filteredLogs.length > 0 ? ((page - 1) * limit) + 1 : 0} to {Math.min(page * limit, count)} of {count} entries
                        </span>
                        <Select value={pageSize} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20 / page</SelectItem>
                                <SelectItem value="50">50 / page</SelectItem>
                                <SelectItem value="100">100 / page</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <span className="text-sm font-medium px-3">
                            Page {page} of {Math.max(1, totalPages)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Detail Sheet - Improved */}
            <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-border">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <span className="block">Audit Log Details</span>
                                {selectedLog && (
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {format(new Date(selectedLog.created_at), "PPpp")}
                                    </span>
                                )}
                            </div>
                        </SheetTitle>
                    </SheetHeader>

                    {selectedLog && (
                        <div className="py-6 space-y-6">
                            {/* Action Summary Card */}
                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <ActionBadge action={selectedLog.action} />
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(selectedLog.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{selectedLog.users?.name || "Unknown user"}</span>
                                    {" performed "}
                                    <span className="font-medium text-foreground">{selectedLog.action?.replace(/_/g, " ").toLowerCase()}</span>
                                    {" on "}
                                    <span className="font-medium text-foreground">{selectedLog.entity_type}</span>
                                    {selectedLog.issuers?.issuer_name && (
                                        <>
                                            {" for "}
                                            <span className="font-medium text-foreground">{selectedLog.issuers.issuer_name}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* User Information */}
                            <section>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User className="h-3.5 w-3.5" />
                                    Performed By
                                </h4>
                                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                                    <DetailRow label="Name" value={selectedLog.users?.name || "Unknown"} />
                                    <DetailRow label="Email" value={selectedLog.users?.email || "-"} copyable onCopy={() => copyToClipboard(selectedLog.users?.email, "email")} copied={copiedField === "email"} />
                                    <DetailRow
                                        label="IP Address"
                                        value={selectedLog.ip_address || "Unknown"}
                                        icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                                        mono
                                    />
                                </div>
                            </section>

                            {/* Target Entity */}
                            <section>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5" />
                                    Target Entity
                                </h4>
                                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                                    <DetailRow
                                        label="Type"
                                        value={
                                            <span className="capitalize">{selectedLog.entity_type?.replace(/_/g, " ")}</span>
                                        }
                                    />
                                    <DetailRow
                                        label="Entity ID"
                                        value={selectedLog.entity_id}
                                        mono
                                        copyable
                                        onCopy={() => copyToClipboard(selectedLog.entity_id, "entity_id")}
                                        copied={copiedField === "entity_id"}
                                    />
                                    {selectedLog.issuers && (
                                        <DetailRow label="Issuer" value={selectedLog.issuers.issuer_name} />
                                    )}
                                </div>
                            </section>

                            {/* Event Payload */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5" />
                                        Event Payload
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.details, null, 2), "details")}
                                    >
                                        {copiedField === "details" ? (
                                            <>
                                                <Check className="h-3 w-3 mr-1 text-green-600" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3 mr-1" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                                    <div className="bg-card border border-border rounded-lg divide-y divide-border">
                                        {Object.entries(selectedLog.details).map(([key, value]) => (
                                            <DetailRow
                                                key={key}
                                                label={key.replace(/_/g, " ")}
                                                value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                mono={typeof value !== 'string'}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                                        <p className="text-sm text-muted-foreground">No additional details recorded</p>
                                    </div>
                                )}
                            </section>

                            {/* Technical Details */}
                            <section>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Monitor className="h-3.5 w-3.5" />
                                    Technical Details
                                </h4>
                                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                                    <DetailRow
                                        label="Timestamp"
                                        value={format(new Date(selectedLog.created_at), "yyyy-MM-dd HH:mm:ss.SSS")}
                                        icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
                                        mono
                                    />
                                    <div className="p-3">
                                        <span className="text-xs text-muted-foreground block mb-1">User Agent</span>
                                        <p className="text-xs text-foreground break-all font-mono bg-muted/50 p-2 rounded">
                                            {selectedLog.user_agent || "Unknown"}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Log ID */}
                            <div className="pt-4 border-t border-border">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Log ID</span>
                                    <div className="flex items-center gap-2">
                                        <code className="font-mono">{selectedLog.id}</code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => copyToClipboard(selectedLog.id, "log_id")}
                                        >
                                            {copiedField === "log_id" ? (
                                                <Check className="h-3 w-3 text-green-600" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

// Detail Row Component for the sheet
function DetailRow({ label, value, mono, copyable, onCopy, copied, icon }) {
    return (
        <div className="flex items-center justify-between p-3 gap-4">
            <span className="text-xs text-muted-foreground flex items-center gap-2 shrink-0">
                {icon}
                {label}
            </span>
            <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm truncate ${mono ? "font-mono text-xs" : ""}`}>
                    {value}
                </span>
                {copyable && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={onCopy}
                    >
                        {copied ? (
                            <Check className="h-3 w-3 text-green-600" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}

// Action Badge Component
function ActionBadge({ action }) {
    const getActionStyle = (action) => {
        if (action?.includes("DELETE")) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
        if (action?.includes("UPDATE")) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
        if (action?.includes("CREATE") || action?.includes("ADD")) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
    };

    const getActionIcon = (action) => {
        if (action?.includes("DELETE")) return Trash2;
        if (action?.includes("UPDATE")) return Pencil;
        if (action?.includes("CREATE") || action?.includes("ADD")) return Plus;
        return Activity;
    };

    const Icon = getActionIcon(action);

    return (
        <Badge variant="outline" className={`${getActionStyle(action)} gap-1`}>
            <Icon className="h-3 w-3" />
            {action?.replace(/_/g, " ")}
        </Badge>
    );
}

// Entity Display Component
function EntityDisplay({ type, id }) {
    const Icon = ENTITY_ICONS[type] || FileText;
    const shortId = id?.length > 12 ? `${id.slice(0, 8)}...` : id;

    return (
        <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium capitalize">{type?.replace(/_/g, " ")}</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground font-mono cursor-default">
                                {shortId}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <code className="text-xs">{id}</code>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
