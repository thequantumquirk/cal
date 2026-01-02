"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useAuth } from "@/contexts/AuthContext";
import { getRestrictedStockDocuments } from "@/lib/actions";
import { AlertCircle, X, ArrowLeft, FileText } from "lucide-react";
import { normalizeText } from "@/lib/utils";
import TransferRequestsTab from "@/components/transfer-requests/TransferRequestsTab";
import DocumentsTable from "@/components/DocumentsTable";

// ⚡ OPTIMIZED: Fetcher for SWR with parallel JSON parsing
const fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch')
  }
  return res.json()
}

// ⚡ OPTIMIZED: SWR config with 5-minute cache and deduplication
const swrConfig = {
  revalidateOnFocus: false,      // Don't refetch on window focus
  revalidateOnReconnect: false,  // Don't refetch on reconnect
  revalidateOnMount: true,       // Fetch on mount if no cache
  dedupingInterval: 300000,      // Dedupe requests within 5min (⚡ NO DUPLICATE CALLS)
  focusThrottleInterval: 300000, // Throttle focus revalidation to 5min
  refreshInterval: 0,            // No automatic refresh
  shouldRetryOnError: false,     // Don't retry on error
  errorRetryCount: 0,            // No retries
  revalidateIfStale: false,      // Don't revalidate stale data
}

export default function IssuerRecordsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const issuerId = params?.issuerId;
  const requestIdFromUrl = searchParams.get("requestId");

  const {
    user,
    userRole,
    currentIssuer,
    availableIssuers,
    issuerSpecificRole,
    loading: authLoading,
    initialized,
  } = useAuth();

  // Auto-switch to transfer tab if requestId is in URL
  const [activeTab, setActiveTab] = useState(requestIdFromUrl ? "transfer" : "depository");
  const [error, setError] = useState(null);

  // Handle URL changes after initial render
  useEffect(() => {
    if (requestIdFromUrl) {
      setActiveTab("transfer");
    }
  }, [requestIdFromUrl]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [userNotes, setUserNotes] = useState({}); // Map of docId -> note text

  const isBroker = userRole === "broker";
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  // ⚡ OPTIMIZED: useRef guard to prevent duplicate execution
  const hasLoadedRef = useRef(false)
  const [securitiesData, setSecuritiesData] = useState(null)

  // ⚡ OPTIMIZED: Single effect with ref guard - NO CASCADING EFFECTS
  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!initialized || !issuerId) return

    const loadSecurities = async () => {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true

      try {
        // Load securities data (this uses server action, can't be in SWR)
        const data = await getRestrictedStockDocuments()
        setSecuritiesData(data)
      } catch (err) {
        console.error("Failed to fetch securities:", err)
      }
    }

    loadSecurities()
  }, [initialized, issuerId])

  // ⚡ OPTIMIZED: SWR for issuer data with PARALLEL fetching
  const { data: issuerData, isLoading: issuerLoading } = useSWR(
    issuerId ? `/api/issuers/${issuerId}` : null,
    fetcher,
    swrConfig
  )

  // ⚡ OPTIMIZED: SWR for notes with PARALLEL fetching
  const { data: notesData, isLoading: notesLoading, mutate: mutateNotes } = useSWR(
    initialized ? '/api/records-management/notes' : null,
    fetcher,
    swrConfig
  )

  // ⚡ OPTIMIZED: Compute derived data from SWR cache
  const securitiesDocs = securitiesData?.find(
    (item) => item.issuer_id === issuerId || item.issuerId === issuerId || item.id === issuerId
  )?.documents || []

  // ⚡ OPTIMIZED: Update userNotes when notesData changes
  useEffect(() => {
    if (notesData?.notes) {
      const notesMap = {}
      notesData.notes.forEach(note => {
        notesMap[note.doc_id] = note.note
      })
      setUserNotes(notesMap)
    }
  }, [notesData])

  const isLoading = issuerLoading || notesLoading || !securitiesData

  // ⚡ OPTIMIZED: Optimistic mutation for instant UI updates
  const saveNote = async (docId, note) => {
    try {
      setError(null);

      // ⚡ OPTIMIZED: Update UI immediately (optimistic)
      setUserNotes(prev => ({
        ...prev,
        [docId]: note
      }));
      setEditingNoteId(null);
      setNoteText("");

      // Update server in background
      const response = await fetch('/api/records-management/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, note }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save note');
      }

      // ⚡ OPTIMIZED: Revalidate SWR cache to ensure sync
      mutateNotes();
    } catch (err) {
      console.error("Save note failed:", err);
      setError(`Failed to save note: ${err.message}`);
      // Revert optimistic update on error
      mutateNotes();
    }
  };

  const normalizeStatus = (status) => {
    if (!status || status === "Pending") return "Pending";
    if (status === "Uploaded" || status === "AwaitingVerification") return "Under Review";
    if (status === "Accepted" || status === "Completed") return "Completed";
    return status;
  };

  // ⚡ OPTIMIZED: Progressive loading - show UI immediately, only block on auth
  if (!initialized) {
    return (
      <div className="flex h-screen bg-background">
        {!isBroker && (
          <Sidebar
            userRole={userRole}
            currentIssuerId={null}
            issuerSpecificRole={issuerSpecificRole}
          />
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            userRole={userRole}
            currentIssuer={currentIssuer}
            availableIssuers={availableIssuers}
            issuerSpecificRole={issuerSpecificRole}
          />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading issuer data...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {!isBroker && (
        <Sidebar
          userRole={userRole}
          currentIssuerId={null}
          issuerSpecificRole={issuerSpecificRole}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          userRole={userRole}
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
        />

        <main className="flex-1 overflow-y-auto p-5">
          <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                {issuerLoading ? (
                  <div className="space-y-3">
                    <div className="h-10 w-64 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-6 w-96 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      {normalizeText(issuerData?.issuer_name || issuerData?.name) || "Issuer Records"}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      View documents, securities administration, and transfer agent requests
                    </p>
                  </>
                )}
              </div>
              {isBroker && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/broker/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tab Buttons */}
            <div className="mb-6 flex gap-2">
              <Button
                variant={activeTab === "depository" ? "default" : "outline"}
                onClick={() => setActiveTab("depository")}
              >
                Document Depository
              </Button>
              <Button
                variant={activeTab === "securities" ? "default" : "outline"}
                onClick={() => setActiveTab("securities")}
              >
                Securities Administration
              </Button>
              <Button
                variant={activeTab === "transfer" ? "default" : "outline"}
                onClick={() => setActiveTab("transfer")}
              >
                Transfer Agent Requests
              </Button>
            </div>

            {/* Tab Content */}
            <Card>
              <CardContent className="pt-6">
                {/* Loading State */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading documents...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Document Depository */}
                    {activeTab === "depository" && (
                      <DocumentsTable issuerId={issuerId} />
                    )}

                    {/* Tab 2: Securities Administration */}
                    {activeTab === "securities" && (
                      <div>
                        {securitiesDocs.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No documents configured for this issuer</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Required</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {securitiesDocs.map((doc) => {
                                const status = normalizeStatus(doc.submission?.status || doc.status);
                                return (
                                  <TableRow key={doc.id}>
                                    <TableCell className="font-medium">{doc.document_type || "N/A"}</TableCell>
                                    <TableCell>{doc.description || "No description"}</TableCell>
                                    <TableCell>{doc.required ? "Yes" : "No"}</TableCell>
                                    <TableCell>
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === "Completed"
                                          ? "bg-green-100 text-green-800"
                                          : status === "Under Review"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-gray-100 text-gray-800"
                                          }`}
                                      >
                                        {status}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {editingNoteId === doc.id ? (
                                        <div className="flex gap-2 items-start">
                                          <Textarea
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="min-w-[250px]"
                                            placeholder="Add your personal note..."
                                            rows={2}
                                          />
                                          <div className="flex flex-col gap-1">
                                            <Button
                                              size="sm"
                                              onClick={() => saveNote(doc.id, noteText)}
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditingNoteId(null);
                                                setNoteText("");
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className="cursor-pointer text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 p-2 rounded"
                                          onClick={() => {
                                            setEditingNoteId(doc.id);
                                            setNoteText(userNotes[doc.id] || "");
                                          }}
                                        >
                                          {userNotes[doc.id] ? (
                                            <span>{userNotes[doc.id]}</span>
                                          ) : (
                                            <span className="text-gray-400 italic">Click to add your note</span>
                                          )}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Transfer Agent Requests */}
                    {activeTab === "transfer" && (
                      <TransferRequestsTab
                        issuerId={issuerId}
                        issuerName={issuerData?.issuer_name || issuerData?.name || "Issuer"}
                        userRole={userRole}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
