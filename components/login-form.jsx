"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

function GoogleSignInButton() {
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
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-6 text-lg font-medium rounded-xl h-[60px] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Signing in...
        </div>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </>
      )}
    </Button>
  )
}

export default function LoginForm() {
  return (
    <div className="w-full space-y-6">
      <GoogleSignInButton />
      
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our terms of service and privacy policy
        </p>
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
          <span>🔒 SSL Encrypted</span>
          <span>•</span>
          <span>🛡️ Enterprise Security</span>
        </div>
      </div>
    </div>
  )
}
