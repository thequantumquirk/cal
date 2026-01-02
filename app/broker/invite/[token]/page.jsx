"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function BrokerInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [invitation, setInvitation] = useState(null);

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (token) {
      verifyInvitation();
    }
  }, [token]);

  const verifyInvitation = async () => {
    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("invited_users_new")
        .select(`
          id,
          email,
          name,
          role_id,
          roles_new:role_id (role_name)
        `)
        .eq("id", token)
        .maybeSingle();

      if (fetchError) {
        console.error("Invitation fetch error:", fetchError);
        setError("Unable to verify invitation. Please try again.");
        return;
      }

      if (!data) {
        setError("This invitation link is invalid or has already been used.");
        return;
      }

      if (data.roles_new?.role_name !== "broker") {
        setError("This invitation is not valid for broker access.");
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error("Verification error:", err);
      setError("An error occurred while verifying your invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!password) {
      toast.error("Please enter a password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // Sign up with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) {
        console.error("Sign up error:", signUpError);

        if (signUpError.message?.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.", { duration: 5000 });
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        toast.error(signUpError.message || "Failed to create account");
        setSubmitting(false);
        return;
      }

      // If email confirmation is required
      if (data?.user?.identities?.length === 0) {
        toast.error("This email is already registered. Please sign in instead.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      // Check if user needs to confirm email
      if (data?.user && !data?.session) {
        toast.success("Account created! Please check your email to confirm your account.", { duration: 6000 });
        setTimeout(() => router.push("/login"), 3000);
        return;
      }

      // User is signed up and logged in - redirect to onboarding
      toast.success("Account created successfully!");
      router.push("/broker/onboarding");

    } catch (err) {
      console.error("Sign up error:", err);
      toast.error("An error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        toast.error("Failed to sign in with Google");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      toast.error("An error occurred");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-2 shadow-lg">
          <CardContent className="pt-8 pb-6 px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Invalid Invitation
            </h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="relative w-[280px] h-14">
            <Image
              src="/logo.png"
              fill
              alt="Efficiency"
              className="object-contain"
              priority
              sizes="280px"
            />
          </div>
        </div>

        <Card className="card-glass">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome
                </h1>
                <p className="text-muted-foreground">
                  Set up your account to get started
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitation?.email || ""}
                    disabled
                    className="h-12 bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      className="h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-base font-medium rounded-xl h-[52px]"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full py-5 text-base font-medium rounded-xl h-[52px] flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our terms of service and privacy policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
