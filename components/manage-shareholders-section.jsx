"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Users,
    ChevronRight,
    ChevronLeft,
    Search,
    Loader2,
    Building2,
    Mail,
    Hash,
    AlertTriangle,
    UserCircle,
    Edit2,
    Check,
    X,
    Filter,
    Link2
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const ITEMS_PER_PAGE = 25

/**
 * Manage Shareholders Section
 * A standalone section for managing shareholder-user linkages across all issuers.
 * Features: Client-side Pagination/Search (for speed), Combined Email/Link Column, App Theme
 */
export default function ManageShareholdersSection() {
    const [shareholders, setShareholders] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingEmail, setEditingEmail] = useState({ id: null, value: "" })
    const [savingEmail, setSavingEmail] = useState(false)
    const [users, setUsers] = useState([])

    // Pagination & Filters
    const [currentPage, setCurrentPage] = useState(1)
    const [issuerFilter, setIssuerFilter] = useState("all")
    const [issuers, setIssuers] = useState([])

    // Fetch all data on mount
    useEffect(() => {
        fetchAllShareholders()
        fetchUsers()
        fetchIssuers()
    }, [])

    const fetchAllShareholders = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            let allShareholders = []
            let offset = 0
            const batchSize = 1000
            let hasMore = true

            // Fetch in batches to overcome Supabase's 1000 row limit
            while (hasMore) {
                const { data, error } = await supabase
                    .from("shareholders_new")
                    .select(`
                        id,
                        issuer_id,
                        first_name,
                        last_name,
                        email,
                        account_number,
                        holder_type,
                        user_id,
                        issuers_new:issuer_id (
                            id,
                            issuer_name,
                            display_name
                        )
                    `)
                    .order("first_name")
                    .range(offset, offset + batchSize - 1)

                if (error) throw error

                if (data && data.length > 0) {
                    allShareholders = [...allShareholders, ...data]
                    offset += batchSize
                    hasMore = data.length === batchSize
                } else {
                    hasMore = false
                }
            }

            setShareholders(allShareholders)
        } catch (err) {
            console.error("Error fetching shareholders:", err)
            toast.error("Failed to load shareholders")
        } finally {
            setLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const res = await fetch(`/api/users`)
            if (!res.ok) throw new Error("Failed to fetch users")
            const data = await res.json()
            setUsers(data.users || [])
        } catch (err) {
            console.error("Error fetching users:", err)
        }
    }

    const fetchIssuers = async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from("issuers_new")
                .select("id, display_name")
                .order("display_name")

            if (error) throw error
            setIssuers(data || [])
        } catch (err) {
            console.error("Error fetching issuers:", err)
        }
    }

    // Client-side filtering for instant search
    const filteredShareholders = useMemo(() => {
        return shareholders.filter(sh => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const matchesSearch = (
                    sh.first_name?.toLowerCase().includes(query) ||
                    sh.last_name?.toLowerCase().includes(query) ||
                    sh.email?.toLowerCase().includes(query) ||
                    sh.account_number?.toLowerCase().includes(query)
                )
                if (!matchesSearch) return false
            }

            // Issuer filter
            if (issuerFilter !== "all" && sh.issuer_id !== issuerFilter) {
                return false
            }

            return true
        })
    }, [shareholders, searchQuery, issuerFilter])

    // Client-side pagination
    const totalPages = Math.ceil(filteredShareholders.length / ITEMS_PER_PAGE)
    const paginatedShareholders = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredShareholders.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredShareholders, currentPage])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, issuerFilter])

    const startEditEmail = (sh) => {
        setEditingEmail({ id: sh.id, value: sh.email || "" })
    }

    const cancelEditEmail = () => {
        setEditingEmail({ id: null, value: "" })
    }

    const saveEmail = async (sh) => {
        if (!editingEmail.value.trim() && !sh.email) {
            cancelEditEmail()
            return
        }

        setSavingEmail(true)
        try {
            const res = await fetch(`/api/shareholders/${sh.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: editingEmail.value.trim() || null })
            })

            if (!res.ok) throw new Error("Failed to update email")

            const data = await res.json()

            toast.success("Email updated successfully")

            // Update local state with the returned shareholder (which includes updated user_id)
            setShareholders(prev => prev.map(s =>
                s.id === sh.id ? data.shareholder : s
            ))

            cancelEditEmail()
        } catch (err) {
            console.error("Error updating email:", err)
            toast.error("Failed to update email")
        } finally {
            setSavingEmail(false)
        }
    }

    const getUserEmail = (userId) => {
        const user = users.find(u => u.id === userId)
        return user?.email || "Unknown User"
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mt-8">
            {/* Header with App Theme Gradient */}
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-background to-muted/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-wealth-gradient rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="h-5 w-5 text-black" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Manage Shareholders</h3>
                            <p className="text-sm text-muted-foreground">
                                Manage shareholder records and email associations
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/5">
                        {filteredShareholders.length} records
                    </Badge>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or account..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-background border-input focus:ring-primary/20"
                        />
                    </div>

                    {/* Issuer Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={issuerFilter} onValueChange={setIssuerFilter}>
                            <SelectTrigger className="w-[200px] bg-background">
                                <SelectValue placeholder="All Issuers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Issuers</SelectItem>
                                {issuers.map(issuer => (
                                    <SelectItem key={issuer.id} value={issuer.id}>
                                        {issuer.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="font-semibold text-xs w-[250px]">Name</TableHead>
                                    <TableHead className="font-semibold text-xs">Issuer</TableHead>
                                    <TableHead className="font-semibold text-xs">Account #</TableHead>
                                    <TableHead className="font-semibold text-xs w-[350px]">Email / Linked User</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedShareholders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12">
                                            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                            <p className="text-muted-foreground">
                                                {searchQuery || issuerFilter !== "all"
                                                    ? "No shareholders match your filters"
                                                    : "No shareholders in the system"}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedShareholders.map((sh) => (
                                        <TableRow key={sh.id} className="hover:bg-muted/30 transition-colors group">
                                            {/* Name */}
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-foreground">{sh.first_name} {sh.last_name}</span>
                                                </div>
                                            </TableCell>

                                            {/* Issuer */}
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal text-xs bg-background">
                                                    <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                                                    {sh.issuers_new?.display_name || "Unknown"}
                                                </Badge>
                                            </TableCell>

                                            {/* Account # */}
                                            <TableCell className="text-muted-foreground font-mono text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    {sh.account_number || "—"}
                                                </div>
                                            </TableCell>

                                            {/* Email / Linked User - Combined Column */}
                                            <TableCell>
                                                <div className="flex items-center justify-between gap-4">
                                                    {editingEmail.id === sh.id ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                                value={editingEmail.value}
                                                                onChange={(e) => setEditingEmail({ ...editingEmail, value: e.target.value })}
                                                                className="h-8 text-sm"
                                                                placeholder="Enter email..."
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveEmail(sh)
                                                                    if (e.key === 'Escape') cancelEditEmail()
                                                                }}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => saveEmail(sh)}
                                                                disabled={savingEmail}
                                                            >
                                                                {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                                onClick={cancelEditEmail}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3 flex-1">
                                                            {/* Status Badge */}
                                                            {sh.user_id ? (
                                                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs border-green-200 dark:border-green-800 flex-shrink-0">
                                                                    <Link2 className="h-3 w-3 mr-1" />
                                                                    Linked
                                                                </Badge>
                                                            ) : sh.email ? (
                                                                <Badge variant="secondary" className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 flex-shrink-0">
                                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                                    Unlinked
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs text-muted-foreground border-dashed flex-shrink-0">
                                                                    No Email
                                                                </Badge>
                                                            )}

                                                            {/* Email Text */}
                                                            <div className="flex items-center gap-2 min-w-0 flex-1 group/email cursor-pointer" onClick={() => startEditEmail(sh)}>
                                                                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                <span className={`text-sm truncate ${!sh.email ? "text-muted-foreground italic" : "text-foreground"}`}>
                                                                    {sh.email || "Add email address..."}
                                                                </span>
                                                                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/email:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredShareholders.length)} of {filteredShareholders.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum
                                        if (totalPages <= 5) {
                                            pageNum = i + 1
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i
                                        } else {
                                            pageNum = currentPage - 2 + i
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}`}
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        )
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
