'use client'

import { memo } from 'react'
import { useDataFetchWithDelay } from '@/hooks/useDataFetchWithDelay'
import { DocumentsTableSkeleton } from '@/components/skeletons/TablesSkeleton'
import { toUSDate } from '@/lib/dateUtils'

function DocumentsTable({ issuerId }) {
  return <DocumentsTableContent issuerId={issuerId} />
}

const DocumentsTableContent = memo(function DocumentsTableContent({ issuerId }) {
  // ⚡ Using SWR hook - skeleton shows during network latency
  const { data, isLoading, error } = useDataFetchWithDelay(
    issuerId ? `/api/issuers/${issuerId}/documents` : null
  )

  const docs = data?.documents
    ? (data.documents || []).sort((a, b) => new Date(b.filing_date) - new Date(a.filing_date))
    : []

  const formatDate = (dateString) => {
    if (!dateString) return "—"
    const formatted = toUSDate(dateString)
    if (!formatted) return "Invalid Date"
    return formatted.replaceAll("/", "-")
  }

  if (isLoading) return <DocumentsTableSkeleton />
  if (error) return <p className="text-destructive">{error.message || "Failed to load documents"}</p>

  return (
    <table className="w-full border border-border">
      <thead>
        <tr className="bg-primary text-primary-foreground">
          <th className="px-3 py-2 text-left font-semibold">Type</th>
          <th className="px-3 py-2 text-left font-semibold">Title</th>
          <th className="px-3 py-2 text-left font-semibold">Filed At</th>
          <th className="px-3 py-2 text-left font-semibold">Link</th>
        </tr>
      </thead>
      <tbody>
        {docs.length > 0 ? (
          docs.map((doc) => (
            <tr key={doc.id} className="border-t border-border hover:bg-accent transition-colors">
              <td className="px-3 py-2">{doc.type}</td>
              <td className="px-3 py-2">{doc.title}</td>
              <td className="px-3 py-2">{formatDate(doc.filing_date)}</td>
              <td className="px-3 py-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground hover:underline text-sm"
                >
                  View PDF
                </a>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="text-center py-4 text-muted-foreground">
              No documents available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
})

export default memo(DocumentsTable);
