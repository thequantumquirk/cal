"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function SecuritiesForm({ securities = [], setSecurities }) {
  const [localSecurities, setLocalSecurities] = useState(securities);

  useEffect(() => {
    setLocalSecurities(securities);
  }, [securities]);

  const handleFieldChange = (index, field, value) => {
    const updated = [...localSecurities];
    updated[index] = { ...updated[index], [field]: value };
    setLocalSecurities(updated);
    setSecurities(updated);
  };

  const addSecurity = () => {
    const updated = [
      ...localSecurities,
      { class_name: "", cusip: "", issue_name: "" },
    ];
    setLocalSecurities(updated);
    setSecurities(updated);
  };

  const removeSecurity = (index) => {
    const updated = localSecurities.filter((_, i) => i !== index);
    setLocalSecurities(updated);
    setSecurities(updated);
  };

  return (
    <div className="space-y-4">
      {localSecurities.map((sec, i) => (
        <div
          key={i}
          className="border border-border p-4 rounded-lg bg-background shadow-sm flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Class Name"
            value={sec.class_name || ""}
            onChange={(e) => handleFieldChange(i, "class_name", e.target.value)}
            className="border border-input bg-background rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <input
            type="text"
            placeholder="CUSIP"
            value={sec.cusip || ""}
            onChange={(e) => handleFieldChange(i, "cusip", e.target.value)}
            className="border border-input bg-background rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <input
            type="text"
            placeholder="Issue Name"
            value={sec.issue_name || ""}
            onChange={(e) => handleFieldChange(i, "issue_name", e.target.value)}
            className="border border-input bg-background rounded px-2 py-1 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => removeSecurity(i)}
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
          onClick={addSecurity}
          className="bg-wealth-gradient text-black font-bold hover:opacity-90"
        >
          + Add Security
        </Button>
      </div>
    </div>
  );
}
