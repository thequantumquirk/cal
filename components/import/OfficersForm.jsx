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
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>{localOfficers.length}</strong> officer(s)/director(s) extracted from the Excel file
        </p>
      </div>

      {localOfficers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No officers/directors found in the uploaded file.</p>
          <p className="text-xs mt-2">Upload a file with an "Officer/Director" section to see them here.</p>
        </div>
      ) : (
        localOfficers.map((o, i) => (
          <div
            key={i}
            className="border p-4 rounded-lg bg-white shadow-sm flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Officer Name</label>
                <input
                  type="text"
                  placeholder="Officer Name"
                  value={o.name || o.officer_name || ""}
                  onChange={(e) =>
                    handleFieldChange(i, "name", e.target.value)
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Title/Position</label>
                <input
                  type="text"
                  placeholder="Position"
                  value={o.title || o.officer_position || ""}
                  onChange={(e) =>
                    handleFieldChange(i, "title", e.target.value)
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">OFAC Status</label>
              <input
                type="text"
                placeholder="OFAC Status"
                value={o.ofac_status || ""}
                onChange={(e) =>
                  handleFieldChange(i, "ofac_status", e.target.value)
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => removeOfficer(i)}
                className="text-red-500 border-red-300 hover:bg-red-50"
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
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
        >
          + Add Officer
        </Button>
      </div>
    </div>
  );
}
