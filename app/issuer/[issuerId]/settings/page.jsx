"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import IssuerDetailsEditor from "@/components/issuer-details-editor"

export default function IssuerSettingsPage({ params: paramsPromise }) {
  const { user, userRole, userRoles, currentIssuer, availableIssuers, issuerSpecificRole, loading, initialized, validateAndSetIssuer } = useAuth()
  const router = useRouter()
  const [issuerId, setIssuerId] = useState(null)

  // ⚡ FIX: Prevent infinite loop with ref guard
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!initialized || !user) return

    const loadData = async () => {
      try {
        const params = await paramsPromise
        const id = params?.issuerId

        if (hasLoadedRef.current) return
        hasLoadedRef.current = true

        setIssuerId(id)

        if (!user) {
          router.push('/login')
          return
        }

        // Just validate auth - IssuerDetailsEditor handles data fetching
        const authResult = await validateAndSetIssuer(id)

        if (!authResult.hasAccess) {
          router.push('/?error=no_access')
          return
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user])

  const handleSave = (updatedIssuer) => {
    // Optionally refresh auth context or redirect
    console.log('Issuer updated:', updatedIssuer)
  }

  // ⚡ PROGRESSIVE LOADING: Only block during auth init
  if (!initialized) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} currentIssuerId={issuerId} issuerSpecificRole={issuerSpecificRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          userRole={userRole}
          userRoles={userRoles}
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <IssuerDetailsEditor
              issuerId={issuerId}
              onSave={handleSave}
            />
          </div>
        </main>
      </div>
    </div>
  )
}