"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/header";
import { useAuth } from "@/contexts/AuthContext";

export default function BrokerProfilePage() {
    const router = useRouter();
    const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, loading: authLoading, initialized } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        company_name: "",
        company_address: "",
        email: "",
        phone_number: "",
        dtcc_participant_number: "",
    });

    useEffect(() => {
        if (initialized && !authLoading) {
            if (!user) {
                router.push("/login");
                return;
            }
            if (userRole !== "broker") {
                router.push("/");
                return;
            }
            loadProfile();
        }
    }, [initialized, authLoading, user, userRole, router]);

    const loadProfile = async () => {
        try {
            const res = await fetch("/api/broker/profile");
            if (res.ok) {
                const profile = await res.json();
                setFormData({
                    first_name: profile.first_name || "",
                    last_name: profile.last_name || "",
                    company_name: profile.company_name || "",
                    company_address: profile.company_address || "",
                    email: user?.email || "",
                    phone_number: profile.phone_number || "",
                    dtcc_participant_number: profile.dtcc_participant_number || "",
                });
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/broker/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    company_name: formData.company_name,
                    company_address: formData.company_address,
                    phone_number: formData.phone_number,
                    dtcc_participant_number: formData.dtcc_participant_number,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save profile");
            }

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!user?.email) {
            toast.error("No email found for password reset");
            return;
        }

        setSendingReset(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/broker/profile`,
            });

            if (error) throw error;

            toast.success("Password reset email sent! Check your inbox.", { duration: 5000 });
        } catch (error) {
            console.error("Password reset error:", error);
            toast.error("Failed to send password reset email");
        } finally {
            setSendingReset(false);
        }
    };

    if (!initialized || authLoading || loading) {
        return (
            <div className="flex h-screen bg-background">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header
                        user={user}
                        userRole={userRole}
                        currentIssuer={currentIssuer}
                        availableIssuers={availableIssuers}
                        issuerSpecificRole={issuerSpecificRole}
                    />
                    <main className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading profile...</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background">
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    user={user}
                    userRole={userRole}
                    currentIssuer={currentIssuer}
                    availableIssuers={availableIssuers}
                    issuerSpecificRole={issuerSpecificRole}
                />

                <main className="flex-1 overflow-y-auto p-5">
                    <div className="max-w-2xl mx-auto">
                        {/* Back Button */}
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="mb-4 -ml-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>

                        {/* Profile Form Card */}
                        <Card className="border-2 shadow-lg mb-6">
                            <CardHeader>
                                <CardTitle className="text-xl">Edit Profile</CardTitle>
                                <CardDescription>Update your personal and company information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSave} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="first_name">First Name</Label>
                                            <Input
                                                id="first_name"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleInputChange}
                                                placeholder="John"
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last_name">Last Name</Label>
                                            <Input
                                                id="last_name"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleInputChange}
                                                placeholder="Doe"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company_name">Company</Label>
                                        <Input
                                            id="company_name"
                                            name="company_name"
                                            value={formData.company_name}
                                            onChange={handleInputChange}
                                            placeholder="Company Name"
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company_address">Company Address</Label>
                                        <Input
                                            id="company_address"
                                            name="company_address"
                                            value={formData.company_address}
                                            onChange={handleInputChange}
                                            placeholder="123 Main St, City, State ZIP"
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            className="h-11 bg-muted"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone_number">Phone Number</Label>
                                        <Input
                                            id="phone_number"
                                            name="phone_number"
                                            type="tel"
                                            value={formData.phone_number}
                                            onChange={handleInputChange}
                                            placeholder="(555) 123-4567"
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dtcc_participant_number">DTCC Participant Number</Label>
                                        <Input
                                            id="dtcc_participant_number"
                                            name="dtcc_participant_number"
                                            value={formData.dtcc_participant_number}
                                            onChange={handleInputChange}
                                            placeholder="0000"
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full h-12 text-base font-semibold"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-5 h-5 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Security Card */}
                        <Card className="border-2 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-xl">Security</CardTitle>
                                <CardDescription>Manage your account security settings</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">Change Password</p>
                                        <p className="text-sm text-muted-foreground">
                                            We'll send a password reset link to your email
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handlePasswordReset}
                                        disabled={sendingReset}
                                    >
                                        {sendingReset ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <KeyRound className="w-4 h-4 mr-2" />
                                                Send Reset Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
