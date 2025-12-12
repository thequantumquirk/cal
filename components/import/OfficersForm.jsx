"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function OfficersForm({ officers = [], setOfficers }) {
  const [localOfficers, setLocalOfficers] = useState(officers);

  useEffect(() => {
    setLocalOfficers(officers);
  }, [officers]);

  const handleFieldChange = (index, field, value) => {
    const updated = [...localOfficers];
    updated[index] = { ...updated[index], [field]: value };
    setLocalOfficers(updated);
    setOfficers(updated);
  };

  const addOfficer = () => {
    const updated = [
      ...localOfficers,
      { name: "", title: "", ofac_status: "" },
    ];
    setLocalOfficers(updated);
    setOfficers(updated);
  };

  const removeOfficer = (index) => {
    const updated = localOfficers.filter((_, i) => i !== index);
    setLocalOfficers(updated);
    setOfficers(updated);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{localOfficers.length}</strong> officer(s)/director(s) extracted from the Excel file
        </p>
      </div>

      {localOfficers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No officers/directors found in the uploaded file.</p>
          <p className="text-xs mt-2">Upload a file with an "Officer/Director" section to see them here.</p>
        </div>
      ) : (
        localOfficers.map((o, i) => (
          <div
            key={i}
            className="border border-border p-4 rounded-lg bg-background shadow-sm flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Officer Name</label>
                <input
                  type="text"
                  placeholder="Officer Name"
                  value={o.name || o.officer_name || ""}
                  onChange={(e) =>
                    handleFieldChange(i, "name", e.target.value)
                  }
                  className="border border-input bg-background rounded px-2 py-1 text-sm w-full text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title/Position</label>
                <input
                  type="text"
                  placeholder="Position"
                  value={o.title || o.officer_position || ""}
                  onChange={(e) =>
                    handleFieldChange(i, "title", e.target.value)
                  }
                  className="border border-input bg-background rounded px-2 py-1 text-sm w-full text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">OFAC Status</label>
              <input
                type="text"
                placeholder="OFAC Status"
                value={o.ofac_status || ""}
                onChange={(e) =>
                  handleFieldChange(i, "ofac_status", e.target.value)
                }
                className="border border-input bg-background rounded px-2 py-1 text-sm w-full text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => removeOfficer(i)}
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
          onClick={addOfficer}
          className="bg-wealth-gradient text-black font-bold hover:opacity-90"
        >
          + Add Officer
        </Button>
      </div>
    </div>
  );
}
