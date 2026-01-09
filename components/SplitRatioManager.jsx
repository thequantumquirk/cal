"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SplitRatioManager({ onClose, issuerId = null }) {
  const [issuers, setIssuers] = useState([]);
  const [selectedIssuer, setSelectedIssuer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [ratios, setRatios] = useState({
    class_a_ratio: "",
    rights_ratio: ""
  });
  const [inputErrors, setInputErrors] = useState({
    class_a_ratio: "",
    rights_ratio: ""
  });

  const [splitSecurityType, setSplitSecurityType] = useState("Warrant"); // "Warrant" or "Right"

  // Fetch issuers or specific issuer
  useEffect(() => {
    if (issuerId) {
      fetchSpecificIssuer(issuerId);
    } else {
      fetchIssuers();
    }
  }, [issuerId]);

  const fetchSpecificIssuer = async (id) => {
    try {
      setInitialLoading(true);
      const response = await fetch(`/api/issuers/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch issuer");
      }
      const data = await response.json();
      setSelectedIssuer(data);
      // Use stored type if available, otherwise fallback to parsing or default
      if (data.split_security_type) {
        setSplitSecurityType(data.split_security_type);
      }
      parseExistingRatios(data.separation_ratio, data.split_security_type);
    } catch (error) {
      console.error("Error fetching issuer:", error);
      showNotification("error", "Failed to load issuer data. Please refresh the page.");
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchIssuers = async () => {
    try {
      setInitialLoading(true);
      const response = await fetch("/api/issuers");
      if (!response.ok) {
        throw new Error("Failed to fetch issuers");
      }
      const data = await response.json();
      setIssuers(data);
    } catch (error) {
      console.error("Error fetching issuers:", error);
      showNotification("error", "Failed to load issuers. Please refresh the page.");
    } finally {
      setInitialLoading(false);
    }
  };

  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filter issuers based on search term
  const filteredIssuers = issuers.filter(issuer =>
    issuer.issuer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issuer.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle issuer selection
  const handleIssuerSelect = (issuer) => {
    setSelectedIssuer(issuer);
    setInputErrors({ class_a_ratio: "", rights_ratio: "" });
    if (issuer.split_security_type) {
      setSplitSecurityType(issuer.split_security_type);
    }
    parseExistingRatios(issuer.separation_ratio, issuer.split_security_type);
  };

  // Parse existing ratio text to extract numbers - FIXED NaN issue
  const parseExistingRatios = (ratioText, storedType) => {
    if (!ratioText || typeof ratioText !== 'string') {
      setRatios({ class_a_ratio: "1", rights_ratio: "0.5" });
      if (!storedType) setSplitSecurityType("Warrant");
      return;
    }

    try {
      // Extract numbers from text like "1 UNIT = 1 CLASS A SHARE AND 1/2 REDEEMABLE WARRANT"
      const classAMatch = ratioText.match(/(\d+(?:\.\d+)?)\s+CLASS\s+A/i);

      // Handle both fraction and decimal formats for warrants/rights
      const fractionMatch = ratioText.match(/(\d+)\/(\d+)\s+(REDEEMABLE\s+)?(WARRANT|RIGHT)/i);
      const decimalMatch = ratioText.match(/(\d+(?:\.\d+)?)\s+(REDEEMABLE\s+)?(WARRANT|RIGHT)/i);

      let classAValue = "1";
      let rightsValue = "0.5";

      // Detect type from text if not explicitly stored
      if (!storedType) {
        if (ratioText.toLowerCase().includes("right")) {
          setSplitSecurityType("Right");
        } else {
          setSplitSecurityType("Warrant");
        }
      }

      if (classAMatch && classAMatch[1]) {
        const parsed = parseFloat(classAMatch[1]);
        if (!isNaN(parsed) && parsed > 0) {
          classAValue = parsed.toString();
        }
      }

      if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
        const numerator = parseFloat(fractionMatch[1]);
        const denominator = parseFloat(fractionMatch[2]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          rightsValue = (numerator / denominator).toString();
        }
      } else if (decimalMatch && decimalMatch[1]) {
        const parsed = parseFloat(decimalMatch[1]);
        if (!isNaN(parsed) && parsed > 0) {
          rightsValue = parsed.toString();
        }
      }

      setRatios({
        class_a_ratio: classAValue,
        rights_ratio: rightsValue
      });
    } catch (error) {
      console.error("Error parsing ratios:", error);
      setRatios({ class_a_ratio: "1", rights_ratio: "0.5" });
    }
  };

  // Validate input
  const validateInput = (value) => {
    if (!value || value.trim() === "") {
      return "This field is required";
    }

    // Handle fraction input
    if (value.includes('/')) {
      const [numerator, denominator] = value.split('/').map(v => v.trim());
      const num = parseFloat(numerator);
      const den = parseFloat(denominator);

      if (isNaN(num) || isNaN(den)) {
        return "Invalid fraction format";
      }
      if (den === 0) {
        return "Denominator cannot be zero";
      }
      if (num <= 0 || den <= 0) {
        return "Values must be positive";
      }
      return "";
    }

    // Handle decimal input
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return "Please enter a valid number";
    }
    if (parsed <= 0) {
      return "Value must be greater than 0";
    }
    if (parsed > 1000) {
      return "Value seems too large";
    }
    return "";
  };

  // Convert fraction input to decimal - FIXED
  const parseFraction = (input) => {
    if (!input || typeof input !== 'string') return "";

    const trimmed = input.trim();
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0].trim());
        const denominator = parseFloat(parts[1].trim());
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return (numerator / denominator).toString();
        }
      }
      return "";
    }

    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? "" : parsed.toString();
  };

  // Format ratio for display in issuers_new table - FIXED
  const formatRatioText = (classA, rights, type) => {
    const classANum = parseFloat(classA);
    const rightsNum = parseFloat(rights);

    if (isNaN(classANum) || isNaN(rightsNum)) {
      return "Invalid ratio values";
    }

    // Format rights as fraction if it's less than 1
    let rightsFormatted;
    if (rightsNum < 1 && rightsNum > 0) {
      // Convert to simple fraction
      const denominator = Math.round(1 / rightsNum);
      rightsFormatted = `1/${denominator}`;
    } else {
      rightsFormatted = rightsNum.toString();
    }

    const typeLabel = type === "Right" ? "RIGHT" : "REDEEMABLE WARRANT";
    return `1 UNIT = ${classANum} CLASS A SHARE AND ${rightsFormatted} ${typeLabel}`;
  };

  // Handle ratio input changes with validation
  const handleRatioChange = (field, value) => {
    const error = validateInput(value);
    setInputErrors(prev => ({
      ...prev,
      [field]: error
    }));

    setRatios(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save updated ratios
  const saveRatios = async () => {
    if (!selectedIssuer) return;

    // Final validation
    const classAError = validateInput(ratios.class_a_ratio);
    const rightsError = validateInput(ratios.rights_ratio);

    if (classAError || rightsError) {
      setInputErrors({
        class_a_ratio: classAError,
        rights_ratio: rightsError
      });
      showNotification("error", "Please fix the errors before saving");
      return;
    }

    const classADecimal = parseFraction(ratios.class_a_ratio);
    const rightsDecimal = parseFraction(ratios.rights_ratio);

    if (!classADecimal || !rightsDecimal || isNaN(parseFloat(classADecimal)) || isNaN(parseFloat(rightsDecimal))) {
      showNotification("error", "Invalid ratio values");
      return;
    }

    setLoading(true);
    try {
      const formattedText = formatRatioText(classADecimal, rightsDecimal, splitSecurityType);

      // Update issuers_new table
      const issuerResponse = await fetch(`/api/issuers/${selectedIssuer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          separation_ratio: formattedText,
          split_security_type: splitSecurityType
        })
      });

      if (!issuerResponse.ok) {
        const errorData = await issuerResponse.json();
        throw new Error(errorData.error || "Failed to update issuer");
      }

      // Create/Update split_events entry
      const splitResponse = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuer_id: selectedIssuer.id,
          transaction_type: "DWAC Withdrawal",  // Match the transaction type used in processing
          class_a_ratio: parseFloat(classADecimal),
          rights_ratio: parseFloat(rightsDecimal)
        })
      });

      if (!splitResponse.ok) {
        const errorData = await splitResponse.json();
        throw new Error(errorData.error || "Failed to update split events");
      }

      showNotification("success", "Split ratios updated successfully!");

      // Hard reload to wipe stale data as requested
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error saving ratios:", error);
      showNotification("error", `Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // RENDER: Single Issuer Mode (Simplified UI)
  if (issuerId) {
    if (initialLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }

    if (!selectedIssuer) {
      return (
        <div className="flex items-center justify-center h-64 text-red-500">
          Failed to load issuer configuration.
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto p-4">
        {/* Notification */}
        {notification && (
          <div className="mb-6">
            <Alert variant={notification.type === "error" ? "destructive" : "default"}
              className={notification.type === "success" ? "bg-green-50 border-green-200" : ""}>
              {notification.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className={notification.type === "success" ? "text-green-800" : ""}>
                {notification.message}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-6">
          <div className="text-sm text-gray-600 mb-4">
            Current Configuration for <span className="font-semibold text-gray-900">{selectedIssuer.issuer_name}</span>
          </div>

          {/* Security Type Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Split Security Type
            </label>
            <div className="flex space-x-4">
              <label className={`flex items-center space-x-2 cursor-pointer p-3 rounded-md border transition-all ${splitSecurityType === "Warrant" ? "bg-white border-blue-500 shadow-sm" : "border-transparent hover:bg-gray-100"}`}>
                <input
                  type="radio"
                  name="securityType"
                  value="Warrant"
                  checked={splitSecurityType === "Warrant"}
                  onChange={(e) => setSplitSecurityType(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Warrant</span>
              </label>
              <label className={`flex items-center space-x-2 cursor-pointer p-3 rounded-md border transition-all ${splitSecurityType === "Right" ? "bg-white border-blue-500 shadow-sm" : "border-transparent hover:bg-gray-100"}`}>
                <input
                  type="radio"
                  name="securityType"
                  value="Right"
                  checked={splitSecurityType === "Right"}
                  onChange={(e) => setSplitSecurityType(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Right</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select whether Units split into Warrants or Rights.
            </p>
          </div>

          {/* Class A Ratio */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Class A Share Ratio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ratios.class_a_ratio}
              onChange={(e) => handleRatioChange("class_a_ratio", e.target.value)}
              placeholder="e.g., 1"
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${inputErrors.class_a_ratio ? "border-red-500" : "border-gray-300"
                }`}
            />
            {inputErrors.class_a_ratio ? (
              <p className="text-xs text-red-500 mt-2">
                {inputErrors.class_a_ratio}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                Number of Class A shares per unit
              </p>
            )}
          </div>

          {/* Rights/Warrant Ratio */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              {splitSecurityType} Ratio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ratios.rights_ratio}
              onChange={(e) => handleRatioChange("rights_ratio", e.target.value)}
              placeholder="e.g., 0.5 or 1/2"
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${inputErrors.rights_ratio ? "border-red-500" : "border-gray-300"
                }`}
            />
            {inputErrors.rights_ratio ? (
              <p className="text-xs text-red-500 mt-2">
                {inputErrors.rights_ratio}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                Accepts decimals (0.5) or fractions (1/2)
              </p>
            )}
          </div>

          {/* Preview */}
          {ratios.class_a_ratio && ratios.rights_ratio && !inputErrors.class_a_ratio && !inputErrors.rights_ratio && (
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200 mt-4">
              <div className="text-xs font-semibold text-green-800 mb-2">Preview</div>
              <div className="text-sm text-green-700 font-mono leading-relaxed break-words">
                {(() => {
                  const classADecimal = parseFraction(ratios.class_a_ratio);
                  const rightsDecimal = parseFraction(ratios.rights_ratio);
                  return formatRatioText(classADecimal, rightsDecimal, splitSecurityType);
                })()}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 mt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-6"
            >
              Close
            </Button>
            <Button
              onClick={saveRatios}
              disabled={loading || !ratios.class_a_ratio || !ratios.rights_ratio ||
                inputErrors.class_a_ratio || inputErrors.rights_ratio}
              className="bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 px-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Multi-Issuer Mode (Original UI)
  return (
    <div className="flex flex-col h-full">
      {/* Notification */}
      {notification && (
        <div className="mb-4 shrink-0">
          <Alert variant={notification.type === "error" ? "destructive" : "default"}
            className={notification.type === "success" ? "bg-green-50 border-green-200" : ""}>
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className={notification.type === "success" ? "text-green-800" : ""}>
              {notification.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden gap-8">
        {/* Issuer Selection Panel */}
        <div className="w-1/2 flex flex-col min-w-0">
          <div className="mb-4 shrink-0">
            <h3 className="font-semibold text-lg mb-3">Select Issuer</h3>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {filteredIssuers.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {filteredIssuers.length} issuer{filteredIssuers.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {initialLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredIssuers.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-gray-400">
              <p className="text-sm">No issuers found</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {filteredIssuers.map((issuer) => (
                <div
                  key={issuer.id}
                  onClick={() => handleIssuerSelect(issuer)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedIssuer?.id === issuer.id
                    ? "bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-200"
                    : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
                    }`}
                >
                  <div className="font-semibold text-sm break-words leading-tight line-clamp-2">
                    {issuer.issuer_name || issuer.display_name}
                  </div>
                  {issuer.separation_ratio && (
                    <div className="text-xs text-gray-500 mt-2 break-words line-clamp-2">
                      {issuer.separation_ratio}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="w-px bg-gray-200 shrink-0"></div>

        {/* Ratio Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedIssuer ? (
            <div className="flex flex-col h-full">
              <div className="mb-4 shrink-0">
                <h3 className="font-semibold text-lg mb-3">Configure Split Ratios</h3>
                <div className="text-sm text-gray-800 p-4 bg-blue-50 rounded-lg border border-blue-200 break-words">
                  <strong className="line-clamp-2">{selectedIssuer.issuer_name || selectedIssuer.display_name}</strong>
                </div>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {/* Class A Ratio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Class A Share Ratio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ratios.class_a_ratio}
                    onChange={(e) => handleRatioChange("class_a_ratio", e.target.value)}
                    placeholder="e.g., 1"
                    className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${inputErrors.class_a_ratio ? "border-red-500" : "border-gray-300"
                      }`}
                  />
                  {inputErrors.class_a_ratio ? (
                    <p className="text-xs text-red-500 mt-2">
                      {inputErrors.class_a_ratio}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      Number of Class A shares per unit
                    </p>
                  )}
                </div>

                {/* Rights/Warrant Ratio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Rights/Warrant Ratio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ratios.rights_ratio}
                    onChange={(e) => handleRatioChange("rights_ratio", e.target.value)}
                    placeholder="e.g., 0.5 or 1/2"
                    className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${inputErrors.rights_ratio ? "border-red-500" : "border-gray-300"
                      }`}
                  />
                  {inputErrors.rights_ratio ? (
                    <p className="text-xs text-red-500 mt-2">
                      {inputErrors.rights_ratio}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      Accepts decimals (0.5) or fractions (1/2)
                    </p>
                  )}
                </div>

                {/* Preview */}
                {ratios.class_a_ratio && ratios.rights_ratio && !inputErrors.class_a_ratio && !inputErrors.rights_ratio && (
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-xs font-semibold text-green-800 mb-2">Preview</div>
                    <div className="text-sm text-green-700 font-mono leading-relaxed break-words">
                      {(() => {
                        const classADecimal = parseFraction(ratios.class_a_ratio);
                        const rightsDecimal = parseFraction(ratios.rights_ratio);
                        return formatRatioText(classADecimal, rightsDecimal);
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedIssuer(null);
                    setInputErrors({ class_a_ratio: "", rights_ratio: "" });
                  }}
                  disabled={loading}
                  className="px-6 py-2 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveRatios}
                  disabled={loading || !ratios.class_a_ratio || !ratios.rights_ratio ||
                    inputErrors.class_a_ratio || inputErrors.rights_ratio}
                  className="bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 px-6 py-2 text-sm font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Ratios"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No Issuer Selected</p>
                <p className="text-sm">Select an issuer from the list to configure split ratios</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}