import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
import "./globals.css"
import { Toaster } from "sonner"
import RouteToastListener from "@/components/route-toast-listener"
import { AuthProvider } from "@/contexts/AuthContext"
import { SWRProvider } from "@/contexts/SWRProvider"
import { QueryProvider } from "@/components/query-provider"
import PerformanceDebugPanel from "@/components/PerformanceDebugPanel"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: "Shareholder Management System",
  description: "Comprehensive shareholder management with role-based access control",
  generator: "v0.app",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className={`${GeistSans.className} bg-background min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative z-10">
            <QueryProvider>
              <SWRProvider>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </SWRProvider>
            </QueryProvider>
          </div>
          <Suspense fallback={null}>
            <RouteToastListener />
          </Suspense>
          <Toaster />
          {/* Performance Monitoring Panel (Dev Only) */}
          {/* {process.env.NODE_ENV === 'development' && <PerformanceDebugPanel />} */}
        </ThemeProvider>
      </body>
    </html>
  )
}
