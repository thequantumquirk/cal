"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Dynamic imports for heavy components
const MultiTickerChart = dynamic(() => import("@/components/multi-ticker-chart"), { ssr: false })
const NewsSection = dynamic(() => import("@/components/news-section"), { ssr: false })
const DashboardCalendar = dynamic(() => import("@/components/dashboard-calendar"), { ssr: false })
const InvestorBreakdown = dynamic(() => import("@/components/investor-breakdown"), { ssr: false })
const InsidersTable = dynamic(() => import("@/components/insiders-table"), { ssr: false })
const InstitutionalInvestorsTable = dynamic(() => import("@/components/institutional-investors-table"), { ssr: false })
const InvestorTargetsTable = dynamic(() => import("@/components/investor-targets-table"), { ssr: false })
const SecuritiesTab = dynamic(() => import("@/components/securities-tab"), { ssr: false })
import {
  generateMockStockData,
  getMockNews,
  getMockCalendarEvents,
  getMockInvestorBreakdown,
  getMockInsiders,
  getMockInstitutionalInvestors,
  getMockInvestorTargets
} from "@/lib/mock-data"
import { Home, Users, Shield, FlaskConical, FileText, MessageSquare } from "lucide-react"

// Mock data for dashboard
function getMockDashboardData() {
  return {
    stockData: generateMockStockData(),
    news: getMockNews(),
    events: getMockCalendarEvents(),
    investorBreakdown: getMockInvestorBreakdown(),
    insiders: getMockInsiders(),
    institutionalInvestors: getMockInstitutionalInvestors(),
    investorTargets: getMockInvestorTargets()
  }
}

export default function DashboardPage({ params: paramsPromise }) {
  const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, userRoles, loading, initialized, validateAndSetIssuer } = useAuth()
  const router = useRouter()
  const [issuerId, setIssuerId] = useState(null)
  const [activeTab, setActiveTab] = useState("home")

  // Get mock data (already cached in memory)
  const mockData = getMockDashboardData()

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

        // Just validate auth - no data fetching needed (using mock data)
        const authResult = await validateAndSetIssuer(id)

        if (!authResult.hasAccess) {
          router.push('/?error=no_access')
          return
        }
      } catch (error) {
        console.error("Error loading dashboard:", error)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user])

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
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
          userRoles={userRoles}
        />

        <main className="flex-1 overflow-y-auto bg-card">
          <div className="py-6">
            <div className="max-w-[1400px] mx-auto px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="inline-flex h-12 items-center justify-start rounded-none border-b border-border bg-transparent p-0 w-full">
                  <TabsTrigger
                    value="home"
                    className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-none transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </TabsTrigger>
                  <TabsTrigger
                    value="shareholders"
                    className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-none transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    Shareholders
                  </TabsTrigger>
                  <TabsTrigger
                    value="securities"
                    className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-none transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Securities
                  </TabsTrigger>
                  <TabsTrigger
                    value="research"
                    className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-none transition-colors"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Research
                  </TabsTrigger>
                  <TabsTrigger
                    value="documentation"
                    className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-none transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    Documentation
                  </TabsTrigger>
                  <TabsTrigger
                    value="messages"
                    className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-none transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </TabsTrigger>
                </TabsList>

                {/* Home Tab Content */}
                <TabsContent value="home" className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <MultiTickerChart data={mockData.stockData} />
                    </div>
                    <div className="lg:col-span-1">
                      <NewsSection news={mockData.news} />
                    </div>
                    <div className="lg:col-span-1">
                      <DashboardCalendar events={mockData.events} />
                    </div>
                  </div>
                </TabsContent>

                {/* Shareholders Tab Content */}
                <TabsContent value="shareholders" className="mt-6 space-y-6">
                  <InvestorBreakdown data={mockData.investorBreakdown} />
                  <InsidersTable insiders={mockData.insiders} />
                  <InstitutionalInvestorsTable investors={mockData.institutionalInvestors} />
                  <InvestorTargetsTable targets={mockData.investorTargets} />
                </TabsContent>

                {/* Securities Tab Content */}
                <TabsContent value="securities" className="mt-6">
                  <SecuritiesTab issuerId={issuerId} />
                </TabsContent>

                {/* Research Tab Content - Placeholder */}
                <TabsContent value="research" className="mt-6">
                  <div className="card-glass border-0 p-12 text-center">
                    <FlaskConical className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Research</h3>
                    <p className="text-muted-foreground">Coming Soon</p>
                  </div>
                </TabsContent>

                {/* Documentation Tab Content - Placeholder */}
                <TabsContent value="documentation" className="mt-6">
                  <div className="card-glass border-0 p-12 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Documentation</h3>
                    <p className="text-muted-foreground">Coming Soon</p>
                  </div>
                </TabsContent>

                {/* Messages Tab Content - Placeholder */}
                <TabsContent value="messages" className="mt-6">
                  <div className="card-glass border-0 p-12 text-center">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Messages</h3>
                    <p className="text-muted-foreground">Coming Soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
