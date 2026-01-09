"use client";

import { useState } from "react";

export default function RecordkeepingTransactionsForm({ transactions, setTransactions }) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edit state - tracks which cell is being edited
  const [editingCell, setEditingCell] = useState(null); // { index: number, field: string }
  const [editValue, setEditValue] = useState("");

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No transactions found in the uploaded file.</p>
        <p className="text-xs mt-2">Upload a file with transaction data to see them here.</p>
      </div>
    );
  }

  // Helper to check if transaction has issues (matches parent validation exactly)
  const hasIssues = (tx) => {
    return (
      !tx.transaction_type ||
      tx.transaction_type === "UNKNOWN" ||
      !tx.transaction_date ||
      !tx.cusip ||
      tx.cusip === "" ||
      !tx.share_quantity ||
      tx.share_quantity === 0 ||
      !tx.shareholder_account ||
      tx.shareholder_account === ""
    );
  };

  const issueCount = transactions.filter(hasIssues).length;

  // Start editing a cell
  const startEditing = (index, field, currentValue) => {
    setEditingCell({ index, field });
    // Convert date to YYYY-MM-DD format for input
    if (field === "transaction_date" && currentValue) {
      if (currentValue instanceof Date) {
        setEditValue(currentValue.toISOString().split("T")[0]);
      } else if (typeof currentValue === "string") {
        // Try to parse various formats
        const parsed = new Date(currentValue);
        if (!isNaN(parsed)) {
          setEditValue(parsed.toISOString().split("T")[0]);
        } else {
          setEditValue("");
        }
      } else {
        setEditValue("");
      }
    } else {
      setEditValue(currentValue || "");
    }
  };

  // Save the edited value
  const saveEdit = () => {
    if (!editingCell) return;

    const { index, field } = editingCell;
    const updatedTransactions = [...transactions];

    if (field === "transaction_date") {
      // Parse date and store as string in YYYY-MM-DD format
      updatedTransactions[index] = {
        ...updatedTransactions[index],
        [field]: editValue || null
      };
    } else {
      updatedTransactions[index] = {
        ...updatedTransactions[index],
        [field]: editValue
      };
    }

    setTransactions(updatedTransactions);
    setEditingCell(null);
    setEditValue("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Handle key press in edit mode
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // Delete a transaction row
  const deleteTransaction = (index) => {
    const updatedTransactions = transactions.filter((_, i) => i !== index);
    setTransactions(updatedTransactions);

    // Adjust current page if needed (e.g., if we deleted the last item on the page)
    const newTotalPages = Math.ceil(updatedTransactions.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  // Confirm delete (optional - for important deletions)
  const [deleteConfirm, setDeleteConfirm] = useState(null); // index to confirm delete

  const handleDeleteClick = (index) => {
    setDeleteConfirm(index);
  };

  const confirmDelete = () => {
    if (deleteConfirm !== null) {
      deleteTransaction(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Pagination calculations
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page with context
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      // Adjust if at boundaries
      if (currentPage <= 3) {
        endPage = maxPagesToShow;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxPagesToShow + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start space-x-3">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
            {transactions.length} transaction(s) extracted
            {issueCount > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                • {issueCount} with issues (marked in red)
              </span>
            )}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Showing {startIndex + 1}-{Math.min(endIndex, transactions.length)} of {transactions.length} transactions (Page {currentPage} of {totalPages}). Rows with red borders have missing or invalid data.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            <strong>Tip:</strong> Click on any date cell to edit it directly. Missing dates will cause position calculation errors.
          </p>
        </div>
      </div>

      {/* Missing Dates Quick Stats */}
      {(() => {
        const missingDates = transactions.filter(t => !t.transaction_date).length;
        if (missingDates === 0) return null;
        return (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                {missingDates} transaction(s) still missing dates
              </span>
            </div>
            <button
              onClick={() => {
                // Find first transaction with missing date and go to that page
                const firstMissingIndex = transactions.findIndex(t => !t.transaction_date);
                if (firstMissingIndex >= 0) {
                  const targetPage = Math.floor(firstMissingIndex / itemsPerPage) + 1;
                  setCurrentPage(targetPage);
                }
              }}
              className="text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 underline"
            >
              Jump to first missing →
            </button>
          </div>
        );
      })()}

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse border border-border">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold border border-border w-10"></th>
              <th className="px-3 py-2 text-left font-semibold border border-border">#</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Issue Name</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">CUSIP</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Transaction Type</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Credit/Debit</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">
                <span className="flex items-center">
                  Date
                  <svg className="w-3 h-3 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Editable">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
              </th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Quantity</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Certificate</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Notes</th>
            </tr>
          </thead>
          <tbody>
            {currentTransactions.map((t, idx) => {
              const rowHasIssues = hasIssues(t);
              const actualIndex = startIndex + idx;
              return (
                <tr
                  key={actualIndex}
                  className={`
                    ${rowHasIssues
                      ? "bg-red-500/10 border-2 border-red-500/50"
                      : "bg-background hover:bg-muted/50"
                    }
                    transition-colors
                  `}
                >
                  {/* Delete Button Cell */}
                  <td className="px-2 py-2 border border-border text-center">
                    {deleteConfirm === actualIndex ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={confirmDelete}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          title="Confirm delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                          title="Cancel"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(actualIndex)}
                        className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete this transaction"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-border text-muted-foreground font-mono text-xs">
                    {actualIndex + 1}
                  </td>
                  <td className="px-3 py-2 border border-border text-foreground">
                    {t.issue_name || <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-border font-mono text-xs text-foreground">
                    {t.cusip ? (
                      t.cusip
                    ) : (
                      <span className="text-red-500 font-semibold">Missing</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-border">
                    {t.transaction_type && t.transaction_type !== "UNKNOWN" ? (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                        {t.transaction_type}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-xs font-semibold">
                        UNKNOWN
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-border text-foreground">
                    {t.credit_debit || <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-border text-xs text-foreground">
                    {editingCell?.index === actualIndex && editingCell?.field === "transaction_date" ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={saveEdit}
                          autoFocus
                          className="w-32 px-1 py-0.5 text-xs border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditing(actualIndex, "transaction_date", t.transaction_date)}
                        className={`cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors ${!t.transaction_date ? "bg-red-500/20" : ""}`}
                        title="Click to edit date"
                      >
                        {t.transaction_date ? (
                          <span className="flex items-center">
                            {t.transaction_date instanceof Date
                              ? t.transaction_date.toLocaleDateString()
                              : t.transaction_date}
                            <svg className="w-3 h-3 ml-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-red-500 font-semibold flex items-center">
                            Missing - Click to add
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-border text-right font-mono text-foreground">
                    {t.share_quantity ? t.share_quantity.toLocaleString() : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-border text-xs text-foreground">
                    {t.certificate_type || <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-border text-xs max-w-xs truncate text-foreground">
                    {t.notes || <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 sm:px-6 rounded-lg">
          {/* Left: Info */}
          <div className="flex flex-1 items-center justify-between sm:hidden">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${currentPage === 1
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-background text-foreground hover:bg-muted border border-border"
                }`}
            >
              Previous
            </button>
            <span className="text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${currentPage === totalPages
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-background text-foreground hover:bg-muted border border-border"
                }`}
            >
              Next
            </button>
          </div>

          {/* Desktop view */}
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{" "}
                <span className="font-medium text-foreground">{Math.min(endIndex, transactions.length)}</span> of{" "}
                <span className="font-medium text-foreground">{transactions.length}</span> transactions
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                {/* Previous Button */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? "cursor-not-allowed opacity-50" : ""
                    }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* First page if not in range */}
                {getPageNumbers()[0] > 1 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0"
                    >
                      1
                    </button>
                    {getPageNumbers()[0] > 2 && (
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-inset ring-border focus:outline-offset-0">
                        ...
                      </span>
                    )}
                  </>
                )}

                {/* Page Numbers */}
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${page === currentPage
                        ? "z-10 bg-wealth-gradient text-black font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                        : "text-foreground ring-1 ring-inset ring-border hover:bg-muted"
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Last page if not in range */}
                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-inset ring-border focus:outline-offset-0">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Next Button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? "cursor-not-allowed opacity-50" : ""
                    }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
