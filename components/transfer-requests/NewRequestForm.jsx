"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileText, X } from "lucide-react";
import { toast } from "sonner";

const REQUEST_TYPES = [
  { value: "DWAC Deposit", label: "DWAC Deposit (for resale)" },
  { value: "DWAC Withdrawal", label: "DWAC Withdrawal" },
  { value: "Unit Split", label: "Unit Split" },
  { value: "Transfer of Ownership", label: "Transfer of Ownership" },
  { value: "Certificate Issuance", label: "Certificate Issuance" },
  { value: "Other", label: "Other (specify)" }
];

const REQUEST_PURPOSES = [
  { value: "For Resale", label: "For Resale (most common)" },
  { value: "For Transfer to DTC", label: "For Transfer to DTC" },
  { value: "Other", label: "Other (specify)" }
];

const REQUIRED_DOCUMENTS = {
  "DWAC Deposit": ["Authorization Letter", "Transfer Form"],
  "DWAC Withdrawal": ["Authorization Letter", "Withdrawal Form"],
  "Unit Split": ["Authorization Letter", "Split Instructions"],
  "Transfer of Ownership": ["Authorization Letter", "Transfer Agreement"],
  "Certificate Issuance": ["Authorization Letter", "Certificate Request"],
  "Other": ["Authorization Letter"]
};

export default function NewRequestForm({ issuerId, issuerName, onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Request Type
  const [requestType, setRequestType] = useState("");
  const [requestPurpose, setRequestPurpose] = useState("");
  const [otherPurpose, setOtherPurpose] = useState("");

  // Step 2: Request Details
  const [shareholderName, setShareholderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [dtcNumber, setDtcNumber] = useState("");
  const [securityType, setSecurityType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cusip, setCusip] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [priority, setPriority] = useState("Normal");

  // Step 3: Documents
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const showPurposeField = requestType === "DWAC Deposit";
  const requiredDocs = REQUIRED_DOCUMENTS[requestType] || [];

  const validateStep1 = () => {
    if (!requestType) {
      toast.error("Please select a request type");
      return false;
    }
    if (showPurposeField && !requestPurpose) {
      toast.error("Please select a purpose");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!shareholderName) {
      toast.error("Shareholder name is required");
      return false;
    }
    if (!accountNumber) {
      toast.error("Account number is required");
      return false;
    }
    if (!securityType) {
      toast.error("Security type is required");
      return false;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      toast.error("Valid quantity is required");
      return false;
    }
    if (!requestedDate) {
      toast.error("Requested completion date is required");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const uploadedTypes = documents.map(d => d.documentType);
    const missingDocs = requiredDocs.filter(req => !uploadedTypes.includes(req));

    if (missingDocs.length > 0) {
      toast.error(`Please upload required documents: ${missingDocs.join(", ")}`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleFileUpload = async (file, docType) => {
    if (!file) return;

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("issuerId", issuerId);
      formData.append("documentType", docType);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        console.error("Upload failed:", errorData);
        throw new Error(errorData.error || errorData.details || "Failed to upload file");
      }

      const uploadResult = await uploadRes.json();

      // Add to documents list
      setDocuments([...documents, {
        documentType: docType,
        documentName: file.name,
        fileUrl: uploadResult.file_url,
        fileSize: uploadResult.file_size,
        fileType: uploadResult.file_type,
        file: file
      }]);

      toast.success(`${docType} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setSubmitting(true);
    try {
      // Create request
      const requestRes = await fetch("/api/transfer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuerId,
          requestType,
          requestPurpose: requestPurpose === "Other" ? otherPurpose : requestPurpose,
          shareholderName,
          accountNumber,
          dtcNumber,
          securityType,
          quantity: Number(quantity),
          cusip,
          requestedCompletionDate: requestedDate,
          specialInstructions,
          priority
        })
      });

      if (!requestRes.ok) {
        const error = await requestRes.json();
        throw new Error(error.error || "Failed to create request");
      }

      const newRequest = await requestRes.json();

      // Upload documents
      for (const doc of documents) {
        await fetch("/api/transfer-requests/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: newRequest.id,
            documentType: doc.documentType,
            documentName: doc.documentName,
            fileUrl: doc.fileUrl,
            fileSize: doc.fileSize,
            fileType: doc.fileType,
            isRequired: requiredDocs.includes(doc.documentType)
          })
        });
      }

      toast.success("Request submitted successfully!");
      onSuccess(newRequest);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={onCancel} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">New Transfer Agent Request</h1>
        <p className="text-gray-600">{issuerName}</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={step >= 1 ? 'text-orange-600 font-medium' : 'text-gray-500'}>Request Type</span>
          <span className={step >= 2 ? 'text-orange-600 font-medium' : 'text-gray-500'}>Details</span>
          <span className={step >= 3 ? 'text-orange-600 font-medium' : 'text-gray-500'}>Documents</span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Request Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Select Request Type *</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showPurposeField && (
                <div>
                  <Label>Purpose *</Label>
                  <RadioGroup value={requestPurpose} onValueChange={setRequestPurpose}>
                    {REQUEST_PURPOSES.map((purpose) => (
                      <div key={purpose.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={purpose.value} id={purpose.value} />
                        <Label htmlFor={purpose.value}>{purpose.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {requestPurpose === "Other" && (
                    <Input
                      className="mt-2"
                      value={otherPurpose}
                      onChange={(e) => setOtherPurpose(e.target.value)}
                      placeholder="Specify purpose..."
                    />
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleNext}>
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Request Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Shareholder/Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Shareholder Name *</Label>
                    <Input
                      value={shareholderName}
                      onChange={(e) => setShareholderName(e.target.value)}
                      placeholder="Enter shareholder name"
                    />
                  </div>
                  <div>
                    <Label>Account Number *</Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <Label>DTC Number (if applicable)</Label>
                    <Input
                      value={dtcNumber}
                      onChange={(e) => setDtcNumber(e.target.value)}
                      placeholder="Enter DTC number"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Securities Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Security Type *</Label>
                    <Select value={securityType} onValueChange={setSecurityType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select security type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class A Common Stock">Class A Common Stock</SelectItem>
                        <SelectItem value="Class B Common Stock">Class B Common Stock</SelectItem>
                        <SelectItem value="Units">Units</SelectItem>
                        <SelectItem value="Rights">Rights</SelectItem>
                        <SelectItem value="Warrants">Warrants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of Shares/Units *</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <Label>CUSIP (if known)</Label>
                    <Input
                      value={cusip}
                      onChange={(e) => setCusip(e.target.value)}
                      placeholder="Enter CUSIP"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Requested Completion Date *</Label>
                    <Input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Special Instructions (optional)</Label>
                  <Textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Enter any special instructions..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <Button onClick={handleNext}>
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Required Documents</h3>
                {requiredDocs.map((docType) => {
                  const uploaded = documents.find(d => d.documentType === docType);
                  return (
                    <div key={docType} className="mb-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <span className="font-medium">{docType} *</span>
                          </div>
                          {uploaded ? (
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{uploaded.documentName} ({formatFileSize(uploaded.fileSize)})</span>
                              <button
                                onClick={() => handleRemoveDocument(documents.indexOf(uploaded))}
                                className="ml-2 text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-orange-600">Required document not uploaded</p>
                          )}
                        </div>
                        {!uploaded && (
                          <div>
                            <label className="cursor-pointer">
                              <Button variant="outline" size="sm" disabled={uploading} asChild>
                                <span>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Select File
                                </span>
                              </Button>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                onChange={(e) => handleFileUpload(e.target.files[0], docType)}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Additional Documents (Optional)</h3>
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Click to upload additional documents</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const docType = prompt("Enter document type:");
                        if (docType) {
                          handleFileUpload(e.target.files[0], docType);
                        }
                      }}
                    />
                  </label>
                </div>
                {documents.filter(d => !requiredDocs.includes(d.documentType)).map((doc, i) => (
                  <div key={i} className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{doc.documentType}: {doc.documentName}</span>
                    <button
                      onClick={() => handleRemoveDocument(documents.indexOf(doc))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Note: All required documents must be uploaded before submission. Documents can be in PDF, DOC, DOCX, PNG, or JPG format (max 10MB each).
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || uploading}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
