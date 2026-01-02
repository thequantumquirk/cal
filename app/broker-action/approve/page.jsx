"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Loader2, AlertTriangle, Building2, Hash, Layers } from "lucide-react";
import { toast } from "sonner";

function ApprovePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = searchParams.get("requestId");
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [request, setRequest] = useState(null);
    const [issuer, setIssuer] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (requestId) {
            fetchRequestDetails();
        } else {
            setError("Missing request ID");
            setLoading(false);
        }
    }, [requestId]);

    const fetchRequestDetails = async () => {
        try {
            const res = await fetch(`/api/transfer-requests?requestId=${requestId}`);
            if (!res.ok) {
                throw new Error("Failed to fetch request details");
            }
            const data = await res.json();
            setRequest(data);

            // Fetch issuer details
            if (data.issuer_id) {
                const issuerRes = await fetch(`/api/issuers/${data.issuer_id}`);
                if (issuerRes.ok) {
                    const issuerData = await issuerRes.json();
                    setIssuer(issuerData);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            const res = await fetch("/api/transfer-requests/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    token,
                    action: "approve"
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to approve request");
            }

            toast.success("Request approved! Redirecting to transaction processing...");

            // Build enriched notes with broker request details
            const warrantsLabel = issuer?.split_security_type === "Right" ? "Rights" : "Warrants";
            const enrichedNotes = [
                `Broker Split Request #${request.request_number}`,
                `DTC Participant #: ${request.dtc_participant_number}`,
                `DWAC Submitted: ${request.dwac_submitted ? 'Yes' : 'No'}`,
                `Units: ${(request.units_quantity || request.quantity || 0).toLocaleString()}`,
                `Class A: ${(request.class_a_shares_quantity || request.units_quantity || request.quantity || 0).toLocaleString()}`,
                `${warrantsLabel}: ${(request.warrants_rights_quantity || request.units_quantity || request.quantity || 0).toLocaleString()}`,
                request.special_instructions ? `Instructions: ${request.special_instructions}` : null
            ].filter(Boolean).join(' | ');

            // Redirect to transaction processing page with prepopulated data
            const params = new URLSearchParams({
                brokerRequestId: requestId,
                transactionType: 'Split',
                quantity: (request.units_quantity || request.quantity || 0).toString(),
                notes: enrichedNotes
            });

            const transactionUrl = `/issuer/${request.issuer_id}/transaction-processing?${params.toString()}`;
            router.push(transactionUrl);
        } catch (err) {
            console.error("Approve error:", err);
            toast.error(err.message);
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading request details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <Button
                            variant="outline"
                            className="mt-6"
                            onClick={() => router.push("/")}
                        >
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const warrantsLabel = issuer?.split_security_type === "Right" ? "Rights" : "Warrants";
    const unitsQty = request?.units_quantity || request?.quantity || 0;
    const classAQty = request?.class_a_shares_quantity || unitsQty;
    const warrantsQty = request?.warrants_rights_quantity || unitsQty;

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <Image
                        src="/final.png"
                        alt="Efficiency Transfer Agent"
                        width={180}
                        height={50}
                        priority
                    />
                </div>

                <Card className="border-green-500/30">
                    <CardHeader className="border-b border-border pb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-500/10 rounded-full">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Approve Broker Split Request</CardTitle>
                                <CardDescription>Request #{request?.request_number}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-6">
                        {/* Broker Information */}
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Broker Information</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">DTC Participant #:</span>
                                    <span className="ml-2 font-mono font-bold">{request?.dtc_participant_number || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">DWAC Submitted:</span>
                                    <Badge className={`ml-2 ${request?.dwac_submitted ? 'bg-green-600' : 'bg-amber-500'}`}>
                                        {request?.dwac_submitted ? "Yes" : "No"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Split Details */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Split Transaction</h3>
                            </div>

                            <div className="space-y-3">
                                {/* Units - DEBIT */}
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <Badge variant="destructive" className="text-xs mb-1">DEBIT</Badge>
                                            <p className="font-medium">Units</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                CUSIP: {request?.units_cusip || request?.cusip || "N/A"}
                                            </p>
                                        </div>
                                        <p className="text-xl font-bold text-destructive">
                                            -{unitsQty.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Class A - CREDIT */}
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <Badge className="bg-green-600 text-xs mb-1">CREDIT</Badge>
                                            <p className="font-medium">Class A Shares</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                CUSIP: {request?.class_a_cusip || "N/A"}
                                            </p>
                                        </div>
                                        <p className="text-xl font-bold text-green-600">
                                            +{classAQty.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Warrants/Rights - CREDIT */}
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <Badge className="bg-green-600 text-xs mb-1">CREDIT</Badge>
                                            <p className="font-medium">{warrantsLabel}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                CUSIP: {request?.warrants_cusip || "N/A"}
                                            </p>
                                        </div>
                                        <p className="text-xl font-bold text-green-600">
                                            +{warrantsQty.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Special Instructions */}
                        {request?.special_instructions && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <h4 className="text-sm font-semibold text-amber-800 mb-1">Special Instructions</h4>
                                <p className="text-sm text-amber-700">{request.special_instructions}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-border">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => router.back()}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleApprove}
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Approving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Approve & Process
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            Approving will redirect you to the transaction processing page with prepopulated data.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ApprovePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <ApprovePageContent />
        </Suspense>
    );
}
