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
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Centered Login Form */}
      <div className="w-full max-w-md space-y-8 p-8">
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
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center mb-4">
                <div className="relative w-[280px] h-14 mx-auto">
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
              <h1 className="text-3xl font-bold text-foreground">
                Welcome
              </h1>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
