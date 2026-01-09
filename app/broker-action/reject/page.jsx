"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { XCircle, Loader2, AlertTriangle, Building2, Layers } from "lucide-react";
import { toast } from "sonner";

function RejectPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = searchParams.get("requestId");
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [request, setRequest] = useState(null);
    const [issuer, setIssuer] = useState(null);
    const [error, setError] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

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

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        if (rejectionReason.trim().length < 10) {
            toast.error("Please provide a more detailed rejection reason (at least 10 characters)");
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/transfer-requests/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    token,
                    action: "reject",
                    rejectionReason: rejectionReason.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to reject request");
            }

            toast.success("Request rejected successfully. The broker has been notified.");

            // Redirect to information page
            router.push(`/information/${request.issuer_id}`);
        } catch (err) {
            console.error("Reject error:", err);
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

                <Card className="border-destructive/30">
                    <CardHeader className="border-b border-border pb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-destructive/10 rounded-full">
                                <XCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Reject Broker Split Request</CardTitle>
                                <CardDescription>Request #{request?.request_number}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-6">
                        {/* Request Summary */}
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Request Summary</h3>
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

                            <div className="mt-4 pt-4 border-t border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Split Request:</span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <span className="text-destructive font-medium">-{unitsQty.toLocaleString()} Units</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-green-600 font-medium">+{classAQty.toLocaleString()} Class A</span>
                                    <span className="text-muted-foreground">+</span>
                                    <span className="text-green-600 font-medium">+{warrantsQty.toLocaleString()} {warrantsLabel}</span>
                                </div>
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        <div>
                            <Label htmlFor="rejectionReason" className="text-base font-semibold">
                                Rejection Reason *
                            </Label>
                            <p className="text-sm text-muted-foreground mb-3">
                                Please provide a clear reason for rejecting this request.
                                The broker will be notified with this message.
                            </p>
                            <Textarea
                                id="rejectionReason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g., Insufficient documentation, incorrect CUSIP, DWAC not found in DTC system..."
                                rows={4}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                {rejectionReason.length} / 500 characters
                            </p>
                        </div>

                        {/* Common Rejection Reasons */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Quick select:</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    "Incorrect DTC participant number",
                                    "Missing required documentation",
                                    "DWAC not found in DTC system",
                                    "Invalid CUSIP",
                                    "Quantity mismatch"
                                ].map((reason) => (
                                    <Button
                                        key={reason}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setRejectionReason(reason)}
                                    >
                                        {reason}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <div className="flex gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        This action cannot be undone
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        The broker will be notified of the rejection and will need to submit a new request.
                                    </p>
                                </div>
                            </div>
                        </div>

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
                                variant="destructive"
                                className="flex-1"
                                onClick={handleReject}
                                disabled={processing || !rejectionReason.trim()}
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Rejecting...
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject Request
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function RejectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <RejectPageContent />
        </Suspense>
    );
}
