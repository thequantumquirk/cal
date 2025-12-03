"use client";

import { useState } from "react";

export default function RecordkeepingTransactionsForm({ transactions, setTransactions }) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No transactions found in the uploaded file.</p>
        <p className="text-xs mt-2">Upload a file with transaction data to see them here.</p>
      </div>
    );
  }

  // Helper to check if transaction has issues
  const hasIssues = (tx) => {
    return !tx.transaction_type || tx.transaction_type === "UNKNOWN" || !tx.transaction_date || !tx.cusip;
  };

  const issueCount = transactions.filter(hasIssues).length;

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
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse border border-border">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold border border-border">#</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Issue Name</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">CUSIP</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Transaction Type</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Credit/Debit</th>
              <th className="px-3 py-2 text-left font-semibold border border-border">Date</th>
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
                    {t.transaction_date ? (
                      t.transaction_date instanceof Date
                        ? t.transaction_date.toLocaleDateString()
                        : t.transaction_date
                    ) : (
                      <span className="text-red-500 font-semibold">Missing</span>
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
