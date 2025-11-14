"use client";

export default function RecordkeepingTransactionsForm({ transactions, setTransactions }) {
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

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-3">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            {transactions.length} transaction(s) extracted
            {issueCount > 0 && (
              <span className="ml-2 text-red-600">
                • {issueCount} with issues (marked in red)
              </span>
            )}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Showing first 20 rows. Rows with red borders have missing or invalid data.
          </p>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <th className="px-3 py-2 text-left font-semibold border border-white/20">#</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Issue Name</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">CUSIP</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Transaction Type</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Credit/Debit</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Date</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Quantity</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Certificate</th>
              <th className="px-3 py-2 text-left font-semibold border border-white/20">Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 20).map((t, idx) => {
              const rowHasIssues = hasIssues(t);
              return (
                <tr
                  key={idx}
                  className={`
                    ${rowHasIssues
                      ? "bg-red-50 border-2 border-red-400"
                      : idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }
                    hover:bg-orange-50 transition-colors
                  `}
                >
                  <td className="px-3 py-2 border border-gray-200 text-gray-500 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 border border-gray-200">
                    {t.issue_name || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 font-mono text-xs">
                    {t.cusip ? (
                      t.cusip
                    ) : (
                      <span className="text-red-500 font-semibold">Missing</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-gray-200">
                    {t.transaction_type && t.transaction_type !== "UNKNOWN" ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {t.transaction_type}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        UNKNOWN
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-gray-200">
                    {t.credit_debit || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 text-xs">
                    {t.transaction_date ? (
                      t.transaction_date instanceof Date
                        ? t.transaction_date.toLocaleDateString()
                        : t.transaction_date
                    ) : (
                      <span className="text-red-500 font-semibold">Missing</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-mono">
                    {t.share_quantity ? t.share_quantity.toLocaleString() : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 text-xs">
                    {t.certificate_type || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 text-xs max-w-xs truncate">
                    {t.notes || <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {transactions.length > 20 && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Showing first 20 of {transactions.length} rows...
          </p>
        )}
      </div>
    </div>
  );
}
