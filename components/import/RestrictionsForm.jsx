"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function RestrictionsForm({ restrictions = [], setRestrictions }) {
  const [localRestrictions, setLocalRestrictions] = useState(restrictions);

  useEffect(() => {
    setLocalRestrictions(restrictions);
  }, [restrictions]);

  const handleFieldChange = (index, field, value) => {
    const updated = [...localRestrictions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalRestrictions(updated);
    setRestrictions(updated);
  };

  const addRestriction = () => {
    const updated = [
      ...localRestrictions,
      { restriction_code: "", legend_text: "" },
    ];
    setLocalRestrictions(updated);
    setRestrictions(updated);
  };

  const removeRestriction = (index) => {
    const updated = localRestrictions.filter((_, i) => i !== index);
    setLocalRestrictions(updated);
    setRestrictions(updated);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{localRestrictions.length}</strong> restriction template(s) extracted from the Excel file
        </p>
      </div>

      {localRestrictions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No restriction codes found in the uploaded file.</p>
          <p className="text-xs mt-2">Upload a file with a "Restrictions" sheet to see them here.</p>
        </div>
      ) : (
        localRestrictions.map((r, i) => (
          <div
            key={i}
            className="border border-border p-4 rounded-lg bg-background shadow-sm flex flex-col gap-3"
          >
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Restriction Code</label>
              <input
                type="text"
                placeholder="e.g., A, B, 144A"
                value={r.restriction_code || ""}
                onChange={(e) =>
                  handleFieldChange(i, "restriction_code", e.target.value)
                }
                className="border border-input bg-background rounded px-2 py-1 text-sm w-full font-mono text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Legend Text</label>
              <textarea
                placeholder="Full restriction legend text"
                value={r.legend_text || ""}
                onChange={(e) =>
                  handleFieldChange(i, "legend_text", e.target.value)
                }
                className="border border-input bg-background rounded px-2 py-1 text-sm w-full text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => removeRestriction(i)}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                Remove
              </Button>
            </div>
          </div>
        ))
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={addRestriction}
          className="bg-wealth-gradient text-black font-bold hover:opacity-90"
        >
          + Add Restriction
        </Button>
      </div>
    </div>
  );
}
