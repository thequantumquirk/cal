import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import Image from "next/image";

export default async function LoginPage(props) {
  const searchParams = await props.searchParams;
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="card-glass p-8 text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4 text-primary">
            Shareholder Management System
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect Supabase to get started
          </p>
        </div>
      </div>
    );
  }

  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const error = searchParams?.error;
  const signedOut = searchParams?.signedout === "1";

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "not_invited":
        return "User not allowed. Please contact an administrator.";
      case "auth_failed":
        return "Authentication failed. Please make sure you are using a @usefficiency.com email address.";
      case "oauth_exchange_failed":
        return "OAuth exchange failed. Please try again.";
      case "no_user_data":
        return "No user data received from Google. Please try again.";
      case "user_creation_failed":
        return "Failed to create user account. Please contact support.";
      case "user_check_failed":
        return "Error checking user account. Please try again.";
      case "invite_check_failed":
        return "Error checking user invitation. Please try again.";
      case "callback_error":
        return "Authentication callback error. Please try again.";
      case "no_code":
        return "No authorization code received. Please try again.";
      default:
        return "An error occurred during authentication. Please try again.";
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <div className="absolute inset-0 bg-muted/20"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center text-foreground space-y-6">
            <h2 className="text-4xl font-bold">Transfer Agent Portal</h2>
            <p className="text-xl text-muted-foreground">
              Streamlined shareholder management for modern markets
            </p>
            <div className="flex justify-center space-x-4 mt-8">
              <div className="w-3 h-3 bg-primary/60 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-primary/40 rounded-full animate-pulse delay-100"></div>
              <div className="w-3 h-3 bg-primary/20 rounded-full animate-pulse delay-200"></div>
            </div>
          </div>
        </div>
        {/* Floating elements */}
        <div className="absolute top-20 left-20 w-16 h-16 bg-primary/10 rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 right-20 w-12 h-12 bg-secondary/10 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-1/2 right-10 w-8 h-8 bg-accent/10 rounded-full animate-bounce delay-500"></div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {(error || signedOut) && (
            <div className="card-modern p-6 border-l-4 border-destructive">
              {signedOut ? (
                <p className="text-primary font-medium">
                  Signed out successfully.
                </p>
              ) : (
                <>
                  <p className="text-destructive text-sm font-medium">
                    {getErrorMessage(error)}
                  </p>
                  {process.env.NODE_ENV === "development" && (
                    <p className="text-destructive/80 text-xs mt-2">Debug: {error}</p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="card-glass p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto flex items-center justify-center mb-2">
                  <Image
                    src="/logo.png"
                    alt="logo"
                    width={200}
                    height={36}
                  />
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome Back
                </h1>
                <p className="text-muted-foreground">
                  Access your shareholder management dashboard
                </p>
              </div>

              <LoginForm />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Secure access for authorized transfer agent personnel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
