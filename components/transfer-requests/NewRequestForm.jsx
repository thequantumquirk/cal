"use client";

import { useState, useEffect } from "react";
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
  { value: "IPO", label: "Original Issuance (IPO)" },
  { value: "Split", label: "Split (Units → Class A + Warrants/Rights)" },
  { value: "DWAC Deposit", label: "DWAC Deposit" },
  { value: "DWAC Withdrawal", label: "DWAC Withdrawal" },
  { value: "Transfer Credit", label: "Transfer Credit" },
  { value: "Transfer Debit", label: "Transfer Debit" },
  { value: "Other", label: "Other (specify)" }
];

const REQUEST_PURPOSES = [
  { value: "For Resale", label: "For Resale (most common)" },
  { value: "For Transfer to DTC", label: "For Transfer to DTC" },
  { value: "Other", label: "Other (specify)" }
];

const REQUIRED_DOCUMENTS = {
  "IPO": ["Authorization Letter", "Issuance Instructions"],
  "Split": ["Authorization Letter", "Split Instructions"],
  "DWAC Deposit": ["Authorization Letter", "Deposit Form"],
  "DWAC Withdrawal": ["Authorization Letter", "Withdrawal Form"],
  "Transfer Credit": ["Authorization Letter", "Transfer Form"],
  "Transfer Debit": ["Authorization Letter", "Transfer Form"],
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
  const [selectedShareholder, setSelectedShareholder] = useState(null);
  const [shareholderName, setShareholderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedCusip, setSelectedCusip] = useState("");
  const [securityType, setSecurityType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cusip, setCusip] = useState("");
  const [notes, setNotes] = useState("");

  // Shareholder data
  const [shareholders, setShareholders] = useState([]);
  const [shareholderPositions, setShareholderPositions] = useState([]);
  const [loadingShareholders, setLoadingShareholders] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);

  // Step 3: Documents
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const showPurposeField = requestType === "DWAC Deposit";
  const requiredDocs = REQUIRED_DOCUMENTS[requestType] || [];

  // Fetch shareholders when component mounts
  useEffect(() => {
    fetchShareholders();
  }, [issuerId]);

  const fetchShareholders = async () => {
    setLoadingShareholders(true);
    try {
      const res = await fetch(`/api/shareholders?issuerId=${issuerId}`);
      if (!res.ok) throw new Error('Failed to fetch shareholders');
      const data = await res.json();
      setShareholders(data || []);
    } catch (error) {
      console.error('Error fetching shareholders:', error);
      toast.error('Failed to load shareholders');
    } finally {
      setLoadingShareholders(false);
    }
  };

  const fetchShareholderPositions = async (shareholderId) => {
    if (!shareholderId || !issuerId) return;

    setLoadingPositions(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Fetch all transactions for this shareholder
      const { data: transactions, error } = await supabase
        .from('transfers_new')
        .select('cusip, transaction_type, share_quantity')
        .eq('issuer_id', issuerId)
        .eq('shareholder_id', shareholderId);

      if (error) throw error;

      // Calculate positions by CUSIP
      const positionsByCusip = {};
      transactions?.forEach((txn) => {
        if (!positionsByCusip[txn.cusip]) {
          positionsByCusip[txn.cusip] = 0;
        }

        const isCredit = !(
          txn.transaction_type === 'DWAC Withdrawal' ||
          txn.transaction_type === 'Transfer Debit' ||
          txn.transaction_type === 'Debit' ||
          txn.transaction_type?.toLowerCase().includes('debit')
        );

        const shareChange = isCredit ? txn.share_quantity : -txn.share_quantity;
        positionsByCusip[txn.cusip] += shareChange;
      });

      // Fetch security details
      const { data: securities } = await supabase
        .from('securities_new')
        .select('cusip, issue_name, class_name')
        .eq('issuer_id', issuerId);

      // Convert to array with security details
      const positions = Object.entries(positionsByCusip)
        .filter(([cusip, balance]) => balance > 0) // Only show positive balances
        .map(([cusip, balance]) => {
          const security = securities?.find((s) => s.cusip === cusip);
          return {
            cusip,
            balance,
            security_name: security?.issue_name || 'Unknown',
            security_type: security?.class_name || '',
          };
        });

      setShareholderPositions(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Failed to load shareholder positions');
      setShareholderPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  const handleShareholderChange = (shareholderId) => {
    const shareholder = shareholders.find(sh => sh.id === shareholderId);
    if (shareholder) {
      setSelectedShareholder(shareholderId);
      setShareholderName(`${shareholder.first_name || ''} ${shareholder.last_name || ''}`.trim());
      setAccountNumber(shareholder.account_number || '');
      setSelectedCusip('');
      setSecurityType('');
      setQuantity('');
      setCusip('');
      fetchShareholderPositions(shareholderId);
    }
  };

  const handleCusipChange = (cusipValue) => {
    const position = shareholderPositions.find(p => p.cusip === cusipValue);
    if (position) {
      setSelectedCusip(cusipValue);
      setCusip(cusipValue);
      setSecurityType(position.security_name || '');
    }
  };

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
    if (!selectedShareholder) {
      toast.error("Please select a shareholder");
      return false;
    }
    if (!accountNumber) {
      toast.error("Account number is required");
      return false;
    }
    if (!selectedCusip) {
      toast.error("Please select a security");
      return false;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      toast.error("Valid quantity is required");
      return false;
    }

    // Validate quantity doesn't exceed available shares
    const position = shareholderPositions.find(p => p.cusip === selectedCusip);
    if (position && Number(quantity) > position.balance) {
      toast.error(`Quantity cannot exceed available shares (${position.balance.toLocaleString()})`);
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
          securityType,
          quantity: Number(quantity),
          cusip,
          notes
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
        <Button variant="ghost" onClick={onCancel} className="mb-4 hover:bg-primary/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
        <h1 className="text-3xl font-bold text-foreground">New Transfer Agent Request</h1>
        <p className="text-muted-foreground">{issuerName}</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-all ${
                step >= s
                  ? 'bg-wealth-gradient text-black shadow-md'
                  : 'bg-muted text-muted-foreground'
                }`}>
                {step > s ? <CheckCircle2 className="w-7 h-7" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-2 mx-2 rounded-full transition-all ${
                step > s ? 'bg-wealth-gradient shadow-sm' : 'bg-muted'
              }`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-sm font-medium">
          <span className={step >= 1 ? 'text-primary' : 'text-muted-foreground'}>Request Type</span>
          <span className={step >= 2 ? 'text-primary' : 'text-muted-foreground'}>Details</span>
          <span className={step >= 3 ? 'text-primary' : 'text-muted-foreground'}>Documents</span>
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
                <Button onClick={handleNext} className="bg-wealth-gradient hover:opacity-90 text-black font-semibold">
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Request Details */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Shareholder Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Shareholder</h3>
                <div>
                  <Label>Shareholder *</Label>
                  {loadingShareholders ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-t-2 border-t-secondary"></div>
                    </div>
                  ) : (
                    <Select value={selectedShareholder || ""} onValueChange={handleShareholderChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select shareholder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {shareholders.map((shareholder) => (
                          <SelectItem key={shareholder.id} value={shareholder.id}>
                            {shareholder.account_number} - {[shareholder.first_name, shareholder.last_name].filter(Boolean).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Show positions if shareholder selected */}
              {selectedShareholder && (
                <>
                  {loadingPositions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-t-2 border-t-secondary"></div>
                    </div>
                  ) : shareholderPositions.length === 0 ? (
                    <div className="p-4 bg-secondary/20 border-2 border-secondary/40 rounded-md">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                        <p className="text-sm text-foreground">
                          This shareholder has no active positions
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Position Summary */}
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-md">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          Shareholder Positions
                        </h4>
                        <div className="space-y-2">
                          {shareholderPositions.map((position) => (
                            <div
                              key={position.cusip}
                              className="flex justify-between items-center text-sm p-2 bg-card rounded hover:bg-primary/5 transition-colors"
                            >
                              <span className="text-muted-foreground">
                                {position.cusip} - {position.security_name}
                              </span>
                              <span className="font-semibold text-foreground">
                                {position.balance.toLocaleString()} shares
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Security Selection */}
                      <div>
                        <Label>Select Security *</Label>
                        <Select value={selectedCusip} onValueChange={handleCusipChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select security..." />
                          </SelectTrigger>
                          <SelectContent>
                            {shareholderPositions.map((position) => (
                              <SelectItem key={position.cusip} value={position.cusip}>
                                {position.cusip} - {position.security_name} ({position.balance.toLocaleString()} shares)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity Input */}
                      {selectedCusip && (
                        <div>
                          <Label>Number of Shares/Units *</Label>
                          <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            max={shareholderPositions.find(p => p.cusip === selectedCusip)?.balance}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Available: {shareholderPositions.find(p => p.cusip === selectedCusip)?.balance.toLocaleString()} shares
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Notes */}
              {selectedShareholder && selectedCusip && (
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or special instructions..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <Button onClick={handleNext} disabled={!selectedShareholder || !selectedCusip} className="bg-wealth-gradient hover:opacity-90 text-black font-semibold disabled:opacity-50">
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
                    <div key={docType} className={`mb-4 p-4 border-2 rounded-lg transition-all ${
                      uploaded ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-5 h-5 ${uploaded ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-foreground">{docType} *</span>
                          </div>
                          {uploaded ? (
                            <div className="mt-2 flex items-center gap-2 text-sm text-primary font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{uploaded.documentName} ({formatFileSize(uploaded.fileSize)})</span>
                              <button
                                onClick={() => handleRemoveDocument(documents.indexOf(uploaded))}
                                className="ml-2 text-destructive hover:text-destructive/80 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Required document not uploaded</p>
                          )}
                        </div>
                        {!uploaded && (
                          <div>
                            <label className="cursor-pointer">
                              <Button variant="outline" size="sm" disabled={uploading} className="border-primary/50 hover:bg-primary/10 hover:border-primary" asChild>
                                <span>
                                  <Upload className="w-4 h-4 mr-2" />
                                  {uploading ? 'Uploading...' : 'Select File'}
                                </span>
                              </Button>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                onChange={(e) => handleFileUpload(e.target.files[0], docType)}
                              />
                            </label>
                            {uploading && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-wealth-gradient animate-pulse" style={{ width: '100%' }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">Uploading...</span>
                                </div>
                              </div>
                            )}
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

              <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong>Note:</strong> All required documents must be uploaded before submission. Documents can be in PDF, DOC, DOCX, PNG, or JPG format (max 10MB each).
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || uploading}
                  className="bg-wealth-gradient hover:opacity-90 text-black font-semibold disabled:opacity-50 shadow-md"
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
