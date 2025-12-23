"use client"

import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { User, Bell, Search, Settings, Activity, Users, Building, ArrowRightLeft, Calendar, Shield, Key, ChevronDown, Plus, Home, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getRoleDisplay } from "@/lib/constants"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ModeToggle } from "@/components/mode-toggle"
import NotificationBell from "@/components/notifications/NotificationBell"
import PendingIssuerBanner from "@/components/pending-issuer-banner"

// Page configuration mapping
const pageConfig = {
  // Issuer-scoped pages
  "/issuer/[issuerId]/dashboard": {
    title: "Dashboard",
    description: "",
    icon: Activity,
  },

  "/issuer/[issuerId]/shareholder": {
    title: "Shareholders",
    description: "Manage shareholder information and records",
    icon: Users,
  },
  "/issuer/[issuerId]/transfer-journal": {
    title: "Transfer Journal",
    description: "Comprehensive recordkeeping for securities transactions",
    icon: ArrowRightLeft,
  },
  "/issuer/[issuerId]/historical-lookup": {
    title: "Historical Lookup",
    description: "Search historical shareholder positions by date",
    icon: Calendar,
  },
  // Universal admin pages
  "/issuers": {
    title: "Issuer Management",
    description: "Manage issuers",
    icon: Building,
  },
  "/shareholder-home": {
    title: "Efficiency",
    //description: "Overview of your account",
    icon: Home,
  },

  "/users": {
    title: "User Management",
    description: "Manage user roles and permissions",
    icon: Shield,
  },
  "/roles": {
    title: "Role Management",
    description: "Create and manage user roles and permissions",
    icon: Key,
  }
}

function Header({ user, userRole, currentIssuer, availableIssuers = [], issuerSpecificRole = null, userRoles = [] }) {
  const pathname = usePathname()
  const router = useRouter()

  // For superadmin users, always show "Super Admin" regardless of issuer-specific role
  const isSuperAdmin = userRole === 'superadmin'

  // Check if user has multiple roles for current issuer
  const currentIssuerRoles = userRoles.filter(role => role.issuer_id === currentIssuer?.issuer_id)
  const hasMultipleRoles = currentIssuerRoles.length > 1

  // Use issuer-specific role if available, otherwise fall back to global role
  const displayRole = isSuperAdmin ? 'superadmin' : (issuerSpecificRole || userRole)
  const { color, label, Icon } = getRoleDisplay(displayRole)

  // Check if current path is issuer-scoped
  const isIssuerScoped = pathname.startsWith('/issuer/')
  const hasMultipleIssuers = availableIssuers.length > 1

  // Get current page configuration - handle dynamic routes
  let pageKey = pathname
  if (pathname.includes('/issuer/')) {
    // Convert dynamic route to template for lookup
    pageKey = pathname.replace(/\/issuer\/[^\/]+/, '/issuer/[issuerId]')
  }

  const currentPage = pageConfig[pageKey] || {
    title: "Dashboard",
    description: "", // removed "Welcome back"
    icon: Activity,
  }


  // Handle issuer switching
  const handleIssuerSwitch = (issuerId) => {
    const currentPath = pathname.split('/').slice(3).join('/') || 'dashboard' // Get path after /issuer/[id]/

    // Store the selected issuer in localStorage to persist across refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedIssuerId', issuerId)
    }

    router.push(`/issuer/${issuerId}/${currentPath}`)
  }

  const PageIcon = currentPage.icon

  // Check if we're on a shareholder page
  const isShareholderPage = pathname === "/shareholder-home" || pathname.startsWith("/shareholder-issuer")

  // Check if current issuer is suspended or pending
  const isIssuerSuspended = currentIssuer?.status === 'suspended'
  const isIssuerPending = currentIssuer?.status === 'pending'

  return (
    <header className="bg-card/80 backdrop-blur-xl shadow-lg border-b border-border/20">
      {/* Suspended Issuer Banner */}
      {isIssuerSuspended && isIssuerScoped && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            This issuer is suspended - Read-only mode
          </span>
        </div>
      )}
      {/* Pending Issuer Banner */}
      {isIssuerPending && isIssuerScoped && currentIssuer && (
        <PendingIssuerBanner issuerId={currentIssuer.issuer_id} />
      )}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2">
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Mobile menu button - only show on small screens */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>

          {/* Logo for shareholder and broker pages only */}
          {(pathname === "/shareholder-home" || (userRole === "broker" && pathname.startsWith("/information"))) && (
            <div className="relative w-36 h-10 sm:w-48 sm:h-12 -my-1">
              <Image
                src="/logo.png"
                fill
                alt="Company Logo"
                className="object-contain object-left"
                priority
              />
            </div>
          )}

        </div>

        {/* Issuer Switcher - show for issuer-scoped pages or if superadmin has issuers */}
        {((isIssuerScoped && currentIssuer) || (userRole === 'superadmin' && availableIssuers.length > 0)) && (
          <div className="flex items-center">
            {/* Always show dropdown when there are issuers available */}
            {availableIssuers.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex items-center gap-3 text-base font-bold text-foreground hover:bg-accent/10 rounded-sm px-5 py-2.5 h-12 transition-all duration-300 group border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center transition-all duration-300">
                        <Building className="h-4 w-4 text-foreground transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Issuer</span>
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline text-sm font-semibold">
                            {currentIssuer ? (currentIssuer.issuer_display_name || currentIssuer.issuer_name) : "Select Issuer"}
                          </span>
                          <span className="sm:hidden text-sm font-semibold">
                            {currentIssuer ? ((currentIssuer.issuer_display_name || currentIssuer.issuer_name).split(' ')[0]) : "Select"}
                          </span>
                          {isIssuerSuspended && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                              Suspended
                            </Badge>
                          )}
                          {currentIssuer?.status === 'pending' && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 shadow-2xl border-border/50 rounded-sm">
                  <div className="px-3 py-2 border-b border-border/50 mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Issuers</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{availableIssuers.length} {availableIssuers.length === 1 ? 'company' : 'companies'} total</p>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {availableIssuers.map((issuer) => {
                      const isSelected = currentIssuer && issuer.issuer_id === currentIssuer.issuer_id;
                      const issuerStatus = issuer.status || 'active';
                      const isSuspended = issuerStatus === 'suspended';
                      const isPending = issuerStatus === 'pending';
                      return (
                        <DropdownMenuItem
                          key={issuer.issuer_id}
                          onClick={() => handleIssuerSwitch(issuer.issuer_id)}
                          className={`flex items-center justify-between px-4 py-3 my-1 rounded-sm cursor-pointer transition-all duration-300 group/item ${isSelected
                            ? 'bg-gradient-to-r from-[#ffd900]/30 via-[#fff4a3]/25 to-[#b8860b]/35 text-black shadow-sm ring-1 ring-[#b8860b]/30'
                            : 'hover:bg-accent/10 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center transition-all duration-300">
                              <Building className="h-5 w-5 text-foreground transition-colors duration-300" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm leading-tight ${isSelected ? 'font-bold text-black' : 'font-medium'}`}>
                                  {issuer.issuer_display_name || issuer.issuer_name}
                                </span>
                                {isSuspended && (
                                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                                    Suspended
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-[10px] text-black/70 font-medium mt-0.5">Currently Active</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#b8860b]/30">
                              <Check className="h-3.5 w-3.5 text-black animate-in zoom-in-50 duration-200" />
                            </div>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Single issuer - show with enhanced styling
              currentIssuer && (
                <div className="flex items-center gap-3 text-base font-bold text-foreground rounded-sm px-5 py-2.5 h-12 border border-border/30">
                  <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center">
                    <Building className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Issuer</span>
                    <span className="hidden sm:inline text-sm font-semibold">{currentIssuer.issuer_display_name || currentIssuer.issuer_name}</span>
                    <span className="sm:hidden text-sm font-semibold">{(currentIssuer.issuer_display_name || currentIssuer.issuer_name).split(' ')[0]}</span>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme toggle */}
          <ModeToggle />

          {/* Notification Bell - for admin and broker users */}
          {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'transfer_team' || userRole === 'broker') && (
            <NotificationBell />
          )}

          {/* User profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Role badge with dropdown for multiple roles */}
            {pathname === "/shareholder-home" || pathname.startsWith("/shareholder-issuer") || (userRole === "broker" && pathname.startsWith("/information")) ? (
              // Show user name with gold badge for shareholder and broker pages
              <Badge className="bg-wealth-gradient text-black text-xs font-semibold px-3 sm:px-4 py-1 rounded-full shadow-sm">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </Badge>
            ) : hasMultipleRoles ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`${color} dark:text-white text-xs font-semibold px-2 sm:px-3 py-1 rounded-full shadow-sm flex items-center space-x-1 hover:opacity-80`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(" ")[0]}</span>
                    <Plus className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Your Roles</p>
                  </div>
                  {currentIssuerRoles.map((role, index) => {
                    const roleDisplay = getRoleDisplay(role.roles.name)
                    return (
                      <DropdownMenuItem
                        key={index}
                        className="flex items-center space-x-2 px-3 py-2"
                      >
                        <roleDisplay.Icon className="h-3 w-3" />
                        <span className="text-sm">{roleDisplay.label}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge
                className={`${color} dark:text-white text-xs font-semibold px-2 sm:px-3 py-1 rounded-full shadow-sm flex items-center space-x-1`}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(" ")[0]}</span>
              </Badge>
            )}


            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" style={{ display: user?.user_metadata?.avatar_url ? 'none' : 'flex' }} />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="py-2">
                  <DropdownMenuItem
                    className="flex items-center space-x-2 px-3 py-2 text-destructive hover:text-destructive/90"
                    onClick={async () => {
                      try {
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        router.push('/auth/login')
                      } catch (error) {
                        console.error('Sign out error:', error)
                      }
                    }}
                  >
                    <Key className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

// Memoize Header to prevent unnecessary re-renders during navigation
export default memo(Header)
