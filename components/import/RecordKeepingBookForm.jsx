"use client";

export default function RecordkeepingBookForm({ records = [], setRecords }) {
  const handleChange = (index, field, value) => {
    const updated = [...records];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setRecords(updated);
  };

  const addRecord = () => {
    setRecords([
      ...records,
      {
        issue_name: "",
        issue_ticker: "",
        trading_platform: "",
        cusip: "",
        security_type: "",
        issuance_type: "",
      },
    ]);
  };

  const removeRecord = (index) => {
    setRecords(records.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {records.map((rec, i) => (
        <div
          key={i}
          className="border border-border p-4 rounded-lg bg-background shadow-sm flex flex-col gap-3"
        >
          {/* Issue Name */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-muted-foreground mb-1">
              Issue Name
            </label>
            <input
              type="text"
              value={rec.issue_name || ""}
              onChange={(e) => handleChange(i, "issue_name", e.target.value)}
              className="border border-input bg-background rounded px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter Issue Name"
            />
          </div>

          {/* Issue Ticker */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-muted-foreground mb-1">
              Issue Ticker
            </label>
            <input
              type="text"
              value={rec.issue_ticker || ""}
              onChange={(e) => handleChange(i, "issue_ticker", e.target.value)}
              className="border border-input bg-background rounded px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Ticker"
            />
          </div>

          {/* Trading Platform */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-muted-foreground mb-1">
              Trading Platform
            </label>
            <input
              type="text"
              value={rec.trading_platform || ""}
              onChange={(e) =>
                handleChange(i, "trading_platform", e.target.value)
              }
              className="border border-input bg-background rounded px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g. NASDAQ"
            />
          </div>

          {/* CUSIP */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-muted-foreground mb-1">
              CUSIP
            </label>
            <input
              type="text"
              value={rec.cusip || ""}
              onChange={(e) => handleChange(i, "cusip", e.target.value)}
              className="border border-input bg-background rounded px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="CUSIP"
            />
          </div>

          {/* Security Type */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-muted-foreground mb-1">
              Security Type
            </label>
            <input
              type="text"
              value={rec.security_type || ""}
              onChange={(e) =>
                handleChange(i, "security_type", e.target.value)
              }
              className="border border-input bg-background rounded px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Common, Warrants, Rights..."
            />
          </div>

          {/* Issuance Type */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-muted-foreground mb-1">
              Issuance Type
            </label>
            <input
              type="text"
              value={rec.issuance_type || ""}
              onChange={(e) =>
                handleChange(i, "issuance_type", e.target.value)
              }
              className="border border-input bg-background rounded px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="IPO, DWAC, Transfer..."
            />
          </div>

          {/* Remove button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => removeRecord(i)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Add new record */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addRecord}
          className="bg-wealth-gradient text-black px-4 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-opacity"
        >
          + Add Record
        </button>
      </div>
    </div>
  );
}
