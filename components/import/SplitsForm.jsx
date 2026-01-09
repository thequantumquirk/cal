"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function SplitsForm({ splits = [], setSplits }) {
  const [localSplits, setLocalSplits] = useState(splits);

  // keep local state in sync with parent state
  useEffect(() => {
    setLocalSplits(splits);
  }, [splits]);

  const formatDecimal = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(val);
    if (isNaN(num)) return "";
    return parseFloat(num.toFixed(1)); // one digit after decimal
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...localSplits];
    updated[index] = {
      ...updated[index],
      [field]:
        field === "class_a_ratio" || field === "rights_ratio"
          ? formatDecimal(value)
          : value,
    };
    setLocalSplits(updated);
    setSplits(updated);
  };

  const addSplit = () => {
    const updated = [
      ...localSplits,
      { transaction_type: "DWAC Withdrawal", class_a_ratio: 1.0, rights_ratio: 0.0 },
    ];
    setLocalSplits(updated);
    setSplits(updated);
  };

  const removeSplit = (index) => {
    const updated = localSplits.filter((_, i) => i !== index);
    setLocalSplits(updated);
    setSplits(updated);
  };

  return (
    <div className="space-y-4">
      {localSplits.map((split, i) => (
        <div
          key={i}
          className="border border-border p-4 rounded-lg bg-background shadow-sm flex flex-col gap-3"
        >
          {/* Transaction Type */}
          <div className="flex gap-2 items-center">
            <label className="w-40 text-sm font-medium text-muted-foreground">Transaction Type</label>
            <input
              type="text"
              value={split.transaction_type || ""}
              onChange={(e) =>
                handleFieldChange(i, "transaction_type", e.target.value)
              }
              className="flex-1 border border-input bg-background rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Class A Ratio */}
          <div className="flex gap-2 items-center">
            <label className="w-40 text-sm font-medium text-muted-foreground">Class A Ratio</label>
            <input
              type="number"
              step="0.1"
              value={split.class_a_ratio ?? ""}
              onChange={(e) =>
                handleFieldChange(i, "class_a_ratio", e.target.value)
              }
              className="flex-1 border border-input bg-background rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Rights Ratio */}
          <div className="flex gap-2 items-center">
            <label className="w-40 text-sm font-medium text-muted-foreground">Rights Ratio</label>
            <input
              type="number"
              step="0.1"
              value={split.rights_ratio ?? ""}
              onChange={(e) =>
                handleFieldChange(i, "rights_ratio", e.target.value)
              }
              className="flex-1 border border-input bg-background rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => removeSplit(i)}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={addSplit}
          className="bg-wealth-gradient text-black font-bold hover:opacity-90"
        >
          + Add Split
        </Button>
      </div>
    </div>
  );
}
