"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CheckCircle2, Building2, Hash, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BrokerSplitRequestForm({ issuerId, issuerName, onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Broker DTC Information
  const [dtcParticipantNumber, setDtcParticipantNumber] = useState("");
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

  // Split ratios
  const [splitRatios, setSplitRatios] = useState({ classA: 1, rights: 1 });

  // Fetch broker profile, securities, split ratios when component mounts
  useEffect(() => {
    fetchBrokerProfile();
    fetchSecurities();
    fetchIssuerDetails();
    fetchSplitRatios();
  }, [issuerId]);

  // Auto-calculate Class A and Warrants when Units quantity changes
  useEffect(() => {
    if (unitsQuantity && !isNaN(unitsQuantity) && Number(unitsQuantity) > 0) {
      const qty = Number(unitsQuantity);
      setClassAQuantity(Math.floor(qty * splitRatios.classA).toString());
      setWarrantsQuantity(Math.floor(qty * splitRatios.rights).toString());
    } else {
      setClassAQuantity("");
      setWarrantsQuantity("");
    }
  }, [unitsQuantity, splitRatios]);

  const fetchBrokerProfile = async () => {
    try {
      const res = await fetch("/api/broker/profile");
      if (res.ok) {
        const profile = await res.json();
        // Auto-populate DTC number from profile if available
        // Check both field names for compatibility
        const dtcNumber = profile.dtcc_participant_number || profile.dtc_participant_number;
        if (dtcNumber && !dtcParticipantNumber) {
          setDtcParticipantNumber(dtcNumber);
        }
      }
    } catch (error) {
      console.error("Error fetching broker profile:", error);
      // Non-critical, don't show error toast
    }
  };

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

  const fetchSplitRatios = async () => {
    try {
      const res = await fetch(`/api/splits?issuerId=${issuerId}`);
      if (!res.ok) throw new Error('Failed to fetch split ratios');
      const data = await res.json();
      // Find the DWAC Withdrawal ratio (used for splits)
      const dwacRatio = data?.find(s => s.transaction_type === "DWAC Withdrawal");
      if (dwacRatio) {
        setSplitRatios({
          classA: dwacRatio.class_a_ratio || 1,
          rights: dwacRatio.rights_ratio || 1
        });
      }
    } catch (error) {
      console.error('Error fetching split ratios:', error);
      // Default to 1:1 if fetch fails
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

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

      toast.success("Split request submitted successfully!");
      onSuccess(newRequest);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-6 flex justify-end">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            step === 1
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </span>
            DTC Info
          </div>
          <div className="w-4 h-px bg-border"></div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            step === 2
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </span>
            Details
          </div>
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
                    className="pl-10 font-mono text-lg tracking-wider max-w-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  4-digit DTC participant number (e.g., 0015, 0352)
                </p>
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
              {/* Split Ratio Display */}
              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Split Ratio</span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-foreground">
                    1 Unit → {splitRatios.classA} Class A + {splitRatios.rights} {getSecondSecurityLabel()}
                  </div>
                </div>
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
                        <Label htmlFor="classAQuantity"># of Class A Shares</Label>
                        <Input
                          id="classAQuantity"
                          type="number"
                          value={classAQuantity}
                          readOnly
                          placeholder="Auto-calculated"
                          className="mt-1 bg-muted/50"
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
                        <Label htmlFor="warrantsQuantity"># of {getSecondSecurityLabel()}</Label>
                        <Input
                          id="warrantsQuantity"
                          type="number"
                          value={warrantsQuantity}
                          readOnly
                          placeholder="Auto-calculated"
                          className="mt-1 bg-muted/50"
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

                  {/* Info Note */}
                  <div className="p-4 bg-primary/10 dark:bg-primary/20 border-2 border-primary/30 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">
                        <strong>Note:</strong> Upon submission, the transfer agent admin will receive
                        an email notification with approve/reject options. You will be notified of the status change.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loadingSecurities || submitting}
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
