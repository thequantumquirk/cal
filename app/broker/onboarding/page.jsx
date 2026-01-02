"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  CheckCircle,
  Mail,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function BrokerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

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

  // 2FA state - Email OTP
  const [step, setStep] = useState("form"); // "form" | "verify_email"
  const [verifyCode, setVerifyCode] = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkOnboardingStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);
      setFormData(prev => ({
        ...prev,
        email: authUser.email || ""
      }));

      // First, ensure user is set up (creates user record from invitation if needed)
      try {
        const setupRes = await fetch("/api/broker/setup", { method: "POST" });
        if (!setupRes.ok) {
          const setupError = await setupRes.json();
          console.error("Setup error:", setupError);
          if (setupRes.status === 403) {
            toast.error("No valid invitation found. Please contact support.");
            router.push("/login");
            return;
          }
        }
      } catch (setupErr) {
        console.error("Setup call failed:", setupErr);
      }

      const res = await fetch("/api/broker/profile");
      if (res.ok) {
        const profile = await res.json();

        // If onboarding already completed, redirect to dashboard
        if (profile.onboarding_completed) {
          router.push("/broker/dashboard");
          return;
        }

        // Pre-fill form with existing data
        if (profile.first_name) setFormData(prev => ({ ...prev, first_name: profile.first_name }));
        if (profile.last_name) setFormData(prev => ({ ...prev, last_name: profile.last_name }));
        if (profile.company_name) setFormData(prev => ({ ...prev, company_name: profile.company_name }));
        if (profile.company_address) setFormData(prev => ({ ...prev, company_address: profile.company_address }));
        if (profile.phone_number) setFormData(prev => ({ ...prev, phone_number: profile.phone_number }));
        if (profile.dtcc_participant_number) setFormData(prev => ({ ...prev, dtcc_participant_number: profile.dtcc_participant_number }));
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ["first_name", "last_name", "company_name", "company_address", "phone_number", "dtcc_participant_number"];
    for (const field of required) {
      if (!formData[field]?.trim()) {
        toast.error(`Please fill in ${field.replace(/_/g, " ")}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Save profile data first
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
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save profile");
      }

      // Send email OTP
      await sendEmailOTP();
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error(error.message || "Failed to save profile");
      setSubmitting(false);
    }
  };

  const sendEmailOTP = async () => {
    try {
      const res = await fetch("/api/auth/email-otp", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      toast.success("Verification code sent to your email!");
      setStep("verify_email");
      setCountdown(60); // 60 second cooldown for resend
      setSubmitting(false);
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error(error.message || "Failed to send verification code");
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setResending(true);
    try {
      const res = await fetch("/api/auth/email-otp", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      toast.success("New verification code sent!");
      setCountdown(60);
      setVerifyCode("");
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error(error.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    if (!verifyCode || verifyCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/email-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid code");
        setSubmitting(false);
        return;
      }

      toast.success("Email verified!");
      await completeOnboarding();
    } catch (error) {
      console.error("Verify error:", error);
      toast.error("Failed to verify code");
      setSubmitting(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      const res = await fetch("/api/broker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completeOnboarding: true })
      });

      if (!res.ok) {
        throw new Error("Failed to complete onboarding");
      }

      toast.success("Account setup complete!");

      // Refresh the session to update AuthContext with new role
      const supabase = createClient();
      await supabase.auth.refreshSession();

      setTimeout(() => {
        router.push("/broker/dashboard");
      }, 500);
    } catch (error) {
      console.error("Complete onboarding error:", error);
      toast.error("Failed to complete setup");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Efficiency"
            width={280}
            height={70}
            priority
          />
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Account Setup</CardTitle>
            <CardDescription>
              {step === "form" && "Please complete your profile information"}
              {step === "verify_email" && "Verify your email address"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {step === "form" && (
              <form onSubmit={handleSubmitForm} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="John"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Company Name"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Company Address *</Label>
                  <Input
                    id="company_address"
                    name="company_address"
                    value={formData.company_address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, State ZIP"
                    required
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
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dtcc_participant_number">DTCC Participant Number *</Label>
                  <Input
                    id="dtcc_participant_number"
                    name="dtcc_participant_number"
                    value={formData.dtcc_participant_number}
                    onChange={handleInputChange}
                    placeholder="0000"
                    required
                    className="h-11"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Continue to Enable Two-Factor Authentication"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {step === "verify_email" && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                      We sent a 6-digit verification code to
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {formData.email}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifyCode">Enter verification code</Label>
                    <Input
                      id="verifyCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="h-14 text-center text-2xl tracking-widest font-mono"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || verifyCode.length !== 6}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Verify & Complete Setup
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Didn't receive the code?
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={resending || countdown > 0}
                    className="text-primary"
                  >
                    {resending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Efficiency</p>
        </div>
      </div>
    </div>
  );
}
