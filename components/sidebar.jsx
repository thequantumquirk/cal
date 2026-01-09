"use client";

import { useState, memo, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Shield,
  Key,
  Building,
  FileText,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions";
import { usePrefetchRoutes } from "@/hooks/usePrefetchRoutes";

// Issuer-scoped navigation (requires issuer context)
const getIssuerNavigation = (issuerId, userRole, issuerSpecificRole = "") => {
  const infoScreenItem = {
    name: "Records Management",
    href: "/information",
    icon: LayoutDashboard,
    useGradient: false,
  };

  // 🔹 Brokers get their own navigation
  if (userRole === "broker") {
    return [
      {
        name: "Dashboard",
        href: "/broker/dashboard",
        icon: LayoutDashboard,
        useGradient: true,
      },
      {
        name: "Submit Requests",
        href: "/information",
        icon: FileText,
        useGradient: true,
      },
    ];
  }

  const baseNavigation = [
    {
      name: "Dashboard",
      href: `/issuer/${issuerId}/dashboard`,
      icon: LayoutDashboard,
      useGradient: true,
    },
    {
      name: "RecordKeeping Book",
      href: `/issuer/${issuerId}/record-keeping`,
      icon: TrendingUp,
      useGradient: true,
    },
    {
      name: "Control Book",
      href: `/issuer/${issuerId}/control-book`,
      icon: Shield,
      useGradient: true,
    },
    {
      name: "Shareholders",
      href: `/issuer/${issuerId}/shareholder`,
      icon: Users,
      useGradient: true,
    },
    {
      name: "Transfer Journal",
      href: `/issuer/${issuerId}/transfer-journal`,
      icon: ArrowRightLeft,
      useGradient: true,
    },
    {
      name: "Transaction Processing",
      href: `/issuer/${issuerId}/transaction-processing`,
      icon: Zap,
      useGradient: true,
    },
    {
      name: "Restrictions",
      href: `/issuer/${issuerId}/restrictions`,
      icon: Shield,
      useGradient: true,
    },
    {
      name: "Statement Generation",
      href: `/issuer/${issuerId}/statements`,
      icon: FileText,
      useGradient: true,
    },
    {
      name: "Issuer Profile",
      href: `/issuer/${issuerId}/settings`,
      icon: Building,
      useGradient: true,
    },
  ];

  // Add user management for issuer admins
  // const roleToCheck = issuerSpecificRole || userRole;
  // if (roleToCheck === "admin") {
  //   baseNavigation.push({
  //     name: "User Management",
  //     href: `/issuer/${issuerId}/users`,
  //     icon: Settings,
  //     color: "from-orange-400 to-red-500",
  //   });
  // }

  // 🔹 Add Information Screen for admin (superadmin sees it in System Administration)
  if (userRole === "admin") {
    baseNavigation.push(infoScreenItem);
  }

  return baseNavigation;
};

// Universal admin navigation (not issuer-scoped)
const universalAdminNavigation = [
  {
    name: "Issuer Management",
    href: "/issuers",
    icon: Building,
    useGradient: true,
  },
  {
    name: "User Management",
    href: "/users",
    icon: Settings,
    useGradient: true,
  },
  {
    name: "Role Management",
    href: "/roles",
    icon: Key,
    useGradient: true,
  },
  {
    name: "Records Management",
    href: "/information",
    icon: LayoutDashboard,
    useGradient: false,
  },
];

function Sidebar({
  userRole,
  currentIssuerId,
  issuerSpecificRole,
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState(null);
  const { currentIssuer, getLastIssuer } = useAuth();
  const [lastIssuer, setLastIssuer] = useState(null);
  const { prefetchForRoute } = usePrefetchRoutes();

  // Get last issuer from localStorage on client-side only
  useEffect(() => {
    setLastIssuer(getLastIssuer());
  }, [getLastIssuer]);

  // Clear optimistic path when navigation completes
  useEffect(() => {
    if (optimisticPath && pathname === optimisticPath) {
      setOptimisticPath(null);
    }
  }, [pathname, optimisticPath]);

  // Build navigation based on user role and context
  let issuerScopedNavigation = [];
  let universalNavigation = [];

  // For superadmins, always show both issuer-scoped and universal navigation
  if (userRole === "superadmin") {
    // Always show universal admin navigation for superadmins
    universalNavigation = universalAdminNavigation;

    // For superadmins, always show issuer-scoped navigation (even on universal pages)
    // Priority: currentIssuerId prop > currentIssuer from AuthContext > last issuer from localStorage (via state)
    const effectiveIssuerId = currentIssuerId || currentIssuer?.issuer_id || lastIssuer?.issuer_id;

    if (effectiveIssuerId) {
      issuerScopedNavigation = getIssuerNavigation(
        effectiveIssuerId,
        userRole,
        issuerSpecificRole,
      );
    }
    // If no issuer is available at all, don't show issuer navigation
    // User should select an issuer from the header issuer switcher
  } else {
    // For non-superadmins, show issuer-scoped navigation if we have an issuer context
    // Priority: currentIssuerId prop > currentIssuer from AuthContext > last issuer from localStorage (via state)
    const effectiveIssuerId = currentIssuerId || currentIssuer?.issuer_id || lastIssuer?.issuer_id;

    if (effectiveIssuerId) {
      issuerScopedNavigation = getIssuerNavigation(
        effectiveIssuerId,
        userRole,
        issuerSpecificRole,
      );
    }
  }

  const allNavigation = [...issuerScopedNavigation, ...universalNavigation];

  // Extract route name from href for prefetching (e.g., /issuer/123/dashboard -> "dashboard")
  const extractRouteName = useCallback((href) => {
    const match = href.match(/\/issuer\/[^/]+\/(.+)$/)
    return match ? match[1] : null
  }, [])

  // Handle mouse enter for prefetching
  const handleLinkMouseEnter = useCallback((href) => {
    const effectiveIssuerId = currentIssuerId || currentIssuer?.issuer_id || lastIssuer?.issuer_id
    if (!effectiveIssuerId) return

    const routeName = extractRouteName(href)
    if (routeName) {
      prefetchForRoute(effectiveIssuerId, routeName)
    }
  }, [currentIssuerId, currentIssuer, lastIssuer, extractRouteName, prefetchForRoute])

  const NavLinks = () => (
    <div className="space-y-3">
      {/* Issuer-scoped navigation */}
      {issuerScopedNavigation.length > 0 && (
        <div className="space-y-3">
          {issuerScopedNavigation.map((item) => {
            // Optimistic UI: Instantly show new selection when clicked
            const isActive = optimisticPath
              ? optimisticPath === item.href
              : pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => handleLinkMouseEnter(item.href)}
                onClick={() => {
                  setOptimisticPath(item.href);
                  setIsMobileMenuOpen(false);
                }}
                className={`group relative flex items-center px-4 py-4 text-sm font-medium rounded-2xl transition-all duration-150 transform hover:scale-105 ${isActive
                  ? item.useGradient
                    ? "bg-primary text-primary-foreground shadow-xl"
                    : "bg-primary text-primary-foreground shadow-xl"
                  : "text-foreground hover:bg-card/50 hover:text-foreground backdrop-blur-sm"
                  }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                )}
                <div
                  className={`relative z-10 flex items-center w-full ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                >
                  <item.icon
                    className={`mr-4 h-5 w-5 flex-shrink-0 transition-all duration-150 ${isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                      }`}
                  />
                  <span className="font-semibold">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Separator and Universal admin navigation */}
      {universalNavigation.length > 0 && (
        <>
          {issuerScopedNavigation.length > 0 && (
            <div className="my-6">
              <div className="border-t border-border/30"></div>
              <div className="mt-4 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  System Administration
                </p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {universalNavigation.map((item) => {
              // Optimistic UI: Instantly show new selection when clicked
              const isActive = optimisticPath
                ? optimisticPath === item.href
                : pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onMouseEnter={() => handleLinkMouseEnter(item.href)}
                  onClick={() => {
                    setOptimisticPath(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`group relative flex items-center px-4 py-4 text-sm font-medium rounded-2xl transition-all duration-150 transform hover:scale-105 ${isActive
                    ? item.useGradient
                      ? "bg-primary text-primary-foreground shadow-xl"
                      : "bg-primary text-primary-foreground shadow-xl"
                    : "text-foreground hover:bg-card/50 hover:text-foreground backdrop-blur-sm"
                    }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                  )}
                  <div
                    className={`relative z-10 flex items-center w-full ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                  >
                    <item.icon
                      className={`mr-4 h-5 w-5 flex-shrink-0 transition-all duration-150 ${isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    />
                    <span className="font-semibold">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}


    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-card/80 backdrop-blur-sm shadow-lg border-border/20 hover:bg-card/90"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-80 bg-sidebar/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col sidebar-scrollbar">
          <div className="flex items-center justify-between p-6 border-b border-border/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">
                  Transfer Agent
                </h1>
                <p className="text-xs text-sidebar-foreground/70">Management Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sidebar-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 p-6">
            <NavLinks />
          </nav>
          <div className="p-6 border-t border-border/20">
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive/90 hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full w-80 flex-col bg-sidebar/90 backdrop-blur-xl border-r border-border/20 shadow-2xl">
        <div className="flex flex-1 flex-col overflow-y-auto sidebar-scrollbar">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center px-8 pt-3 pb-6">
            <div className="flex items-start flex-col">
              <div className="">
                {/* Light mode logo (black text) */}
                <div className="relative w-48 h-12">
                  <Image
                    src="/logo.png"
                    fill
                    alt="logo"
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-sidebar-foreground"></h1>
                <p className="text-sm text-sidebar-foreground/70">
                  Transfer Agent Management Portal
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6">
            <NavLinks />
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 p-6 border-t border-border/20">
            <Link href="/logs" prefetch={true}>
              <div className="mb-4 p-4 bg-primary/10 rounded-xl cursor-pointer hover:bg-primary/20 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-sidebar-foreground">
                    System Status
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-sidebar-foreground/70">
                    All systems operational
                  </span>
                </div>
              </div>
            </Link>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive/90 hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Memoize Sidebar to prevent unnecessary re-renders during navigation
export default memo(Sidebar)
