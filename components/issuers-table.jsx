"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building, Plus, Edit, Users, Search, MoreHorizontal, Eye, Trash2, Shield, RefreshCw, AlertTriangle, X, Upload, FileSpreadsheet } from "lucide-react"
import EmptyState from "@/components/empty-state"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
// import EnhancedIssuerModal from "./enhanced-issuer-modal"
import EnhancedIssuerModal from "@/components/enhanced-issuer-modal"
import ImportForm from "@/components/ImportForm"
import { useRouter } from "next/navigation"

function IssuersTable({ issuers, userRole }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedIssuer, setSelectedIssuer] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [issuerToDelete, setIssuerToDelete] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const router = useRouter()

  // Filter issuers based on search (memoized to prevent recomputation on every render)
  const filteredIssuers = useMemo(() => {
    if (!searchTerm) return issuers

    const lowerSearchTerm = searchTerm.toLowerCase()
    return issuers.filter((issuer) =>
      issuer.display_name.toLowerCase().includes(lowerSearchTerm) ||
      issuer.name.toLowerCase().includes(lowerSearchTerm) ||
      issuer.description?.toLowerCase().includes(lowerSearchTerm)
    )
  }, [issuers, searchTerm])

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleEdit = (issuer) => {
    setSelectedIssuer(issuer)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedIssuer(null)
    setIsModalOpen(true)
  }

  // Normalize string for comparison (remove punctuation, lowercase)
  const normalizeString = (str) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  const openDeleteModal = (issuer) => {
    setIssuerToDelete(issuer)
    setDeleteConfirmation("")
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setIssuerToDelete(null)
    setDeleteConfirmation("")
    setIsDeleting(false)
  }

  const confirmDelete = async () => {
    if (!issuerToDelete) return

    // Check if name matches (case-insensitive, punctuation-insensitive)
    const normalizedInput = normalizeString(deleteConfirmation)
    const normalizedIssuerName = normalizeString(issuerToDelete.display_name)

    if (normalizedInput !== normalizedIssuerName) {
      alert("Issuer name does not match. Please type the exact name to confirm deletion.")
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/issuers/${issuerToDelete.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to delete issuer")
      }

      closeDeleteModal()

      // Refresh the page to show updated data immediately
      router.refresh()

      // Also force a hard reload to ensure UI updates
      setTimeout(() => window.location.reload(), 100)
    } catch (error) {
      console.error("Error deleting issuer:", error)
      alert("Error deleting issuer: " + error.message)
      setIsDeleting(false)
    }
  }

  const handleDelete = (issuer) => {
    openDeleteModal(issuer)
  }

  const handleAccess = (issuer) => {
    // Always navigate to dashboard
    router.push(`/issuer/${issuer.id}/dashboard`)
  }

  // Status badge removed - no status field needed

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-foreground">Issuers</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{filteredIssuers.length} issuer{filteredIssuers.length !== 1 ? 's' : ''} found</span>
            </div>
          </div>
        </div>
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issuers..."
                value={searchTerm}
                name="search"
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-background border-input"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="border-input hover:bg-accent text-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              onClick={() => setImportModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-input hover:bg-accent text-foreground"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>

            <Button
              onClick={handleCreate}
              className="h-11 px-6 bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Issuer
            </Button>
          </div>
        </div>



        {/* Table */}
        <div className="rounded-md border border-border overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-muted-foreground whitespace-nowrap py-4">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>Issuer</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground whitespace-nowrap py-4">Description</TableHead>
                  <TableHead className="font-semibold text-muted-foreground whitespace-nowrap py-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </div>
                  </TableHead>

                  <TableHead className="font-semibold text-muted-foreground whitespace-nowrap py-4">Created</TableHead>
                  <TableHead className="font-semibold text-muted-foreground whitespace-nowrap py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssuers.map((issuer, index) => (
                  <TableRow
                    key={issuer.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{issuer.display_name}</div>
                          <div className="text-sm text-muted-foreground">{issuer.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-xs">
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {issuer.description || "No description provided"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-foreground">{issuer.user_count}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(issuer.created_at), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAccess(issuer)}
                          className="border-input hover:bg-accent text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(issuer)}
                          className="border-input hover:bg-accent text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(issuer)}
                          className="border-red-200 hover:bg-red-50 text-red-600 dark:border-red-900 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {filteredIssuers.length === 0 && (
            <EmptyState
              icon={Building}
              title="No Issuers Found"
              description={
                searchTerm
                  ? "No issuers match your search criteria. Try adjusting your search."
                  : "No issuers have been created yet. Create your first issuer to get started."
              }
              actionText="Create First Issuer"
              onAction={handleCreate}
              showAction={!searchTerm}
              secondaryActionText={searchTerm ? "Clear Search" : undefined}
              secondaryOnAction={searchTerm ? () => setSearchTerm("") : undefined}
            />
          )}
        </div>

        {/* Modal */}
        <EnhancedIssuerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          issuer={selectedIssuer}
        />

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={(open) => !isDeleting && !open && closeDeleteModal()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    Delete Issuer
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {issuerToDelete && (
              <div className="space-y-4">
                {/* Warning Box */}
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg">
                  <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
                    ⚠️ You are about to permanently delete:
                  </p>
                  <p className="text-lg font-bold text-red-900 dark:text-red-300 mb-3">
                    {issuerToDelete.display_name}
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-400 mb-2">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-400 space-y-1 ml-4">
                    <li>• All shareholders and their data</li>
                    <li>• All transactions and records</li>
                    <li>• All securities and positions</li>
                    <li>• All restrictions and templates</li>
                    <li>• All documents and officers</li>
                    <li>• All user access to this issuer</li>
                  </ul>
                </div>

                {/* Confirmation Input */}
                <div>
                  <Label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
                    Type the issuer name to confirm deletion:
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2 mt-1">
                    Enter: <span className="font-mono font-semibold text-foreground">{issuerToDelete.display_name}</span>
                  </p>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type issuer name here..."
                    className="border-red-300 focus:border-red-500 focus:ring-red-500"
                    disabled={isDeleting}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Note: Case and punctuation don't matter
                  </p>
                </div>

                {/* Match Indicator */}
                {deleteConfirmation && (
                  <div className="flex items-center gap-2">
                    {normalizeString(deleteConfirmation) === normalizeString(issuerToDelete.display_name) ? (
                      <>
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">Name matches</span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">Name doesn't match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                disabled={
                  isDeleting ||
                  !issuerToDelete ||
                  normalizeString(deleteConfirmation) !== normalizeString(issuerToDelete.display_name)
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Issuer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Excel Modal */}
        {importModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Upload className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Import Excel Data</h3>
                      <p className="text-sm text-muted-foreground">Upload and preview your data before saving</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportModalOpen(false)}
                    className="text-muted-foreground hover:bg-muted rounded-full w-8 h-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <ImportForm onClose={() => setImportModalOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrap component with React.memo to prevent unnecessary re-renders when props don't change
export default memo(IssuersTable)

