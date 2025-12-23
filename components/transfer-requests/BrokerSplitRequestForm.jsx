"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileText, X, Building2, Hash, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const REQUIRED_DOCUMENTS = ["Broker Authorization Letter", "Split Request Form"];

export default function BrokerSplitRequestForm({ issuerId, issuerName, onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Broker DTC Information
  const [dtcParticipantNumber, setDtcParticipantNumber] = useState("");
  const [brokerAccountAtDtc, setBrokerAccountAtDtc] = useState("");
  const [dwacSubmitted, setDwacSubmitted] = useState(false);

  // Step 2: Split Request Details - All 3 Securities
  const [unitsQuantity, setUnitsQuantity] = useState("");
  const [classAQuantity, setClassAQuantity] = useState("");
  const [warrantsQuantity, setWarrantsQuantity] = useState("");

  // CUSIPs for all 3 securities
  const [unitsCusip, setUnitsCusip] = useState("");
  const [classACusip, setClassACusip] = useState("");
  const [warrantsCusip, setWarrantsCusip] = useState("");

  const [notes, setNotes] = useState("");

  // Securities data for CUSIP lookups
  const [securities, setSecurities] = useState([]);
  const [loadingSecurities, setLoadingSecurities] = useState(false);
  const [issuerSplitType, setIssuerSplitType] = useState("Warrant"); // "Warrant" or "Right"

  // Step 3: Documents
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Fetch securities when component mounts
  useEffect(() => {
    fetchSecurities();
    fetchIssuerDetails();
  }, [issuerId]);

  const fetchSecurities = async () => {
    setLoadingSecurities(true);
    try {
      const res = await fetch(`/api/securities?issuerId=${issuerId}`);
      if (!res.ok) throw new Error('Failed to fetch securities');
      const data = await res.json();
      setSecurities(data || []);

      // Auto-populate CUSIPs based on class names
      const unitsSec = data?.find(s => s.class_name?.toLowerCase().includes('unit'));
      const classASec = data?.find(s =>
        s.class_name?.toLowerCase().includes('class a') ||
        s.class_name?.toLowerCase().includes('common stock') ||
        s.class_name?.toLowerCase().includes('ordinary shares')
      );
      const warrantsSec = data?.find(s =>
        s.class_name?.toLowerCase().includes('warrant') ||
        s.class_name?.toLowerCase().includes('right')
      );

      if (unitsSec) setUnitsCusip(unitsSec.cusip);
      if (classASec) setClassACusip(classASec.cusip);
      if (warrantsSec) setWarrantsCusip(warrantsSec.cusip);
    } catch (error) {
      console.error('Error fetching securities:', error);
      toast.error('Failed to load securities');
    } finally {
      setLoadingSecurities(false);
    }
  };

  const fetchIssuerDetails = async () => {
    try {
      const res = await fetch(`/api/issuers/${issuerId}`);
      if (!res.ok) throw new Error('Failed to fetch issuer');
      const data = await res.json();
      setIssuerSplitType(data.split_security_type || "Warrant");
    } catch (error) {
      console.error('Error fetching issuer:', error);
    }
  };

  const getSecondSecurityLabel = () => {
    return issuerSplitType === "Right" ? "Rights" : "Warrants";
  };

  const validateStep1 = () => {
    if (!dtcParticipantNumber || dtcParticipantNumber.length !== 4) {
      toast.error("DTC Participant Number must be exactly 4 digits");
      return false;
    }
    if (!/^\d{4}$/.test(dtcParticipantNumber)) {
      toast.error("DTC Participant Number must contain only digits");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!unitsQuantity || isNaN(unitsQuantity) || Number(unitsQuantity) <= 0) {
      toast.error("Please enter a valid number of Units");
      return false;
    }
    if (!classAQuantity || isNaN(classAQuantity) || Number(classAQuantity) <= 0) {
      toast.error("Please enter a valid number of Class A shares");
      return false;
    }
    if (!warrantsQuantity || isNaN(warrantsQuantity) || Number(warrantsQuantity) <= 0) {
      toast.error(`Please enter a valid number of ${getSecondSecurityLabel()}`);
      return false;
    }
    if (!unitsCusip) {
      toast.error("Units CUSIP is required");
      return false;
    }
    if (!classACusip) {
      toast.error("Class A CUSIP is required");
      return false;
    }
    if (!warrantsCusip) {
      toast.error(`${getSecondSecurityLabel()} CUSIP is required`);
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const uploadedTypes = documents.map(d => d.documentType);
    const missingDocs = REQUIRED_DOCUMENTS.filter(req => !uploadedTypes.includes(req));

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

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
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
        throw new Error(errorData.error || "Failed to upload file");
      }

      const uploadResult = await uploadRes.json();

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
      // Create broker split request
      const requestRes = await fetch("/api/transfer-requests/broker-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuerId,
          requestType: "Split",
          // Broker DTC information
          dtcParticipantNumber,
          brokerAccountAtDtc,
          dwacSubmitted,
          // Split quantities
          unitsQuantity: Number(unitsQuantity),
          classAQuantity: Number(classAQuantity),
          warrantsQuantity: Number(warrantsQuantity),
          // All 3 CUSIPs
          unitsCusip,
          classACusip,
          warrantsCusip,
          // Notes
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
            isRequired: REQUIRED_DOCUMENTS.includes(doc.documentType)
          })
        });
      }

      toast.success("Split request submitted successfully!");
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
        <h1 className="text-3xl font-bold text-foreground">New Broker Split Request</h1>
        <p className="text-muted-foreground">{issuerName}</p>
        <p className="text-sm text-primary mt-1">
          Split Units into Class A Shares + {getSecondSecurityLabel()}
        </p>
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
          <span className={step >= 1 ? 'text-primary' : 'text-muted-foreground'}>DTC Information</span>
          <span className={step >= 2 ? 'text-primary' : 'text-muted-foreground'}>Split Details</span>
          <span className={step >= 3 ? 'text-primary' : 'text-muted-foreground'}>Documents</span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Broker DTC Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Broker DTC Information</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your DTC participant information to process this split request.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="dtcNumber">DTC Participant Number *</Label>
                  <div className="relative mt-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="dtcNumber"
                      type="text"
                      maxLength={4}
                      value={dtcParticipantNumber}
                      onChange={(e) => setDtcParticipantNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="0000"
                      className="pl-10 font-mono text-lg tracking-wider"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    4-digit DTC participant number (e.g., 0015, 0352)
                  </p>
                </div>

                <div>
                  <Label htmlFor="brokerAccount">Broker Account at DTC (Optional)</Label>
                  <Input
                    id="brokerAccount"
                    type="text"
                    value={brokerAccountAtDtc}
                    onChange={(e) => setBrokerAccountAtDtc(e.target.value)}
                    placeholder="Enter account number"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="dwacSubmitted"
                    checked={dwacSubmitted}
                    onCheckedChange={setDwacSubmitted}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="dwacSubmitted" className="text-base font-medium cursor-pointer">
                      DWAC Already Submitted to DTC
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check this box if you have already submitted the DWAC (Deposit/Withdrawal at Custodian)
                      request to DTC. This helps the transfer agent track the status of your request.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleNext} className="bg-wealth-gradient hover:opacity-90 text-black font-semibold">
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Split Request Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Split Transaction Details</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Specify the quantities and CUSIPs for the split. Units will be debited,
                  Class A shares and {getSecondSecurityLabel()} will be credited.
                </p>
              </div>

              {loadingSecurities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-t-2 border-t-secondary"></div>
                </div>
              ) : (
                <>
                  {/* Units (Debit) Section */}
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded font-medium">DEBIT</span>
                        Units
                      </CardTitle>
                      <CardDescription>Securities being split (debited from account)</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="unitsQuantity"># of Units *</Label>
                        <Input
                          id="unitsQuantity"
                          type="number"
                          value={unitsQuantity}
                          onChange={(e) => setUnitsQuantity(e.target.value)}
                          placeholder="Enter quantity"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unitsCusip">Units CUSIP *</Label>
                        <Select value={unitsCusip} onValueChange={setUnitsCusip}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select Units CUSIP" />
                          </SelectTrigger>
                          <SelectContent>
                            {securities
                              .filter(s => s.class_name?.toLowerCase().includes('unit'))
                              .map((sec) => (
                                <SelectItem key={sec.id} value={sec.cusip}>
                                  {sec.cusip} - {sec.class_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Class A (Credit) Section */}
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">CREDIT</span>
                        Class A Shares
                      </CardTitle>
                      <CardDescription>Shares to be credited to account</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="classAQuantity"># of Class A Shares *</Label>
                        <Input
                          id="classAQuantity"
                          type="number"
                          value={classAQuantity}
                          onChange={(e) => setClassAQuantity(e.target.value)}
                          placeholder="Enter quantity"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="classACusip">Class A CUSIP *</Label>
                        <Select value={classACusip} onValueChange={setClassACusip}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select Class A CUSIP" />
                          </SelectTrigger>
                          <SelectContent>
                            {securities
                              .filter(s =>
                                s.class_name?.toLowerCase().includes('class a') ||
                                s.class_name?.toLowerCase().includes('common') ||
                                s.class_name?.toLowerCase().includes('ordinary')
                              )
                              .map((sec) => (
                                <SelectItem key={sec.id} value={sec.cusip}>
                                  {sec.cusip} - {sec.class_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Warrants/Rights (Credit) Section */}
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">CREDIT</span>
                        {getSecondSecurityLabel()}
                      </CardTitle>
                      <CardDescription>{getSecondSecurityLabel()} to be credited to account</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warrantsQuantity"># of {getSecondSecurityLabel()} *</Label>
                        <Input
                          id="warrantsQuantity"
                          type="number"
                          value={warrantsQuantity}
                          onChange={(e) => setWarrantsQuantity(e.target.value)}
                          placeholder="Enter quantity"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="warrantsCusip">{getSecondSecurityLabel()} CUSIP *</Label>
                        <Select value={warrantsCusip} onValueChange={setWarrantsCusip}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={`Select ${getSecondSecurityLabel()} CUSIP`} />
                          </SelectTrigger>
                          <SelectContent>
                            {securities
                              .filter(s =>
                                s.class_name?.toLowerCase().includes('warrant') ||
                                s.class_name?.toLowerCase().includes('right')
                              )
                              .map((sec) => (
                                <SelectItem key={sec.id} value={sec.cusip}>
                                  {sec.cusip} - {sec.class_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Special Instructions (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional instructions or notes for the transfer agent..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loadingSecurities}
                  className="bg-wealth-gradient hover:opacity-90 text-black font-semibold disabled:opacity-50"
                >
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
                {REQUIRED_DOCUMENTS.map((docType) => {
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Request Summary */}
              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <h4 className="font-semibold text-foreground mb-3">Request Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DTC Participant #:</span>
                    <span className="font-mono font-medium">{dtcParticipantNumber}</span>
                  </div>
                  {brokerAccountAtDtc && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Broker Account:</span>
                      <span className="font-mono">{brokerAccountAtDtc}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DWAC Submitted:</span>
                    <span className={dwacSubmitted ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                      {dwacSubmitted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <hr className="my-2 border-border" />
                  <div className="flex justify-between text-destructive">
                    <span>Units (Debit):</span>
                    <span className="font-mono font-medium">-{Number(unitsQuantity).toLocaleString()} ({unitsCusip})</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Class A (Credit):</span>
                    <span className="font-mono font-medium">+{Number(classAQuantity).toLocaleString()} ({classACusip})</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>{getSecondSecurityLabel()} (Credit):</span>
                    <span className="font-mono font-medium">+{Number(warrantsQuantity).toLocaleString()} ({warrantsCusip})</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong>Note:</strong> Upon submission, the transfer agent admin will receive
                    an email notification with approve/reject options. You will be notified of the status change.
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
                  {submitting ? "Submitting..." : "Submit Split Request"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
