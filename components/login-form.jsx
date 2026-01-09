"use client"

import { useState, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

function GoogleSignInButton({ disabled }) {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Error signing in with Google:", error)
        toast.error(error.message)
        setLoading(false)
      }
    } catch (error) {
      toast.error("An error occurred during Google sign in")
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={loading || disabled}
      className="w-full py-5 text-base font-medium rounded-xl h-[52px] flex items-center justify-center gap-3 transition-all duration-300"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
          Signing in...
        </div>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </>
      )}
    </Button>
  )
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleEmailSignIn = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error("Please enter your email and password")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Error signing in:", error)
        // User-friendly error messages
        let errorMessage = "Unable to sign in. Please try again."

        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. If you were invited via email, please use 'Continue with Google' to sign in for the first time."
        } else if (error.message?.includes("Email not confirmed")) {
          errorMessage = "Please verify your email address before signing in. Check your inbox for a confirmation link."
        } else if (error.message?.includes("User not found")) {
          errorMessage = "No account found with this email. If you were invited, please use 'Continue with Google' to set up your account."
        } else if (error.message?.includes("Too many requests")) {
          errorMessage = "Too many sign-in attempts. Please wait a few minutes and try again."
        } else if (error.message?.includes("Network")) {
          errorMessage = "Network error. Please check your internet connection and try again."
        }

        toast.error(errorMessage, { duration: 6000 })
        setLoading(false)
        return
      }

      // User is authenticated - fetch their role and redirect appropriately
      const { data: userData } = await supabase
        .from("users_new")
        .select(`
          id, is_super_admin,
          issuer_users_new(
            issuer_id,
            roles_new:role_id(role_name)
          )
        `)
        .eq("id", data.user.id)
        .single()

      if (userData) {
        const issuerRoles = userData.issuer_users_new || []

        if (userData.is_super_admin) {
          window.location.href = "/issuers"
        } else if (issuerRoles.length > 0) {
          const roleName = issuerRoles[0]?.roles_new?.role_name?.toLowerCase()

          if (roleName === 'shareholder') {
            window.location.href = "/shareholder-home"
          } else if (roleName === 'broker') {
            // Always go to onboarding - it will redirect to dashboard if already completed
            window.location.href = "/broker/onboarding"
          } else if (issuerRoles[0]?.issuer_id) {
            window.location.href = `/issuer/${issuerRoles[0].issuer_id}/dashboard`
          } else {
            window.location.href = "/issuers"
          }
        } else {
          window.location.href = "/shareholder-home"
        }
      } else {
        // User authenticated but not in users table - may need setup
        window.location.href = "/shareholder-home"
      }
    } catch (error) {
      toast.error("An error occurred during sign in")
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-12"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-base font-medium rounded-xl h-[52px] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Signing in...
            </div>
          ) : (
            "Sign In"
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

      <GoogleSignInButton disabled={loading} />

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our terms of service and privacy policy
        </p>
      </div>
    </div>
  )
}

export default memo(LoginForm);
