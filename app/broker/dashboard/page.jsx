"use client";

import { memo, useMemo, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from "@/components/header";
import {
  ArrowRight,
  Building2,
  Loader2
} from "lucide-react";

// ⚡ Fetcher
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

// ⚡ Query keys
const brokerQueryKeys = {
  transferRequests: ["broker", "transfer-requests"],
  issuerData: (id) => ["broker", "issuer", id],
};

// ⚡ Memoized Stats Card component
const StatsCard = memo(function StatsCard({ label, value, colorClass = "" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
});

// ⚡ Memoized Issuer Card with hover prefetch
const IssuerCard = memo(function IssuerCard({ issuer, onHover }) {
  const issuerId = issuer.issuer_id || issuer.id;

  return (
    <Link
      href={`/information/${issuerId}`}
      prefetch={false}
      onMouseEnter={() => onHover(issuerId)}
      className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div>
        <span className="font-medium">{issuer.issuer_display_name || issuer.display_name || issuer.issuer_name}</span>
        {issuer.ticker_symbol && (
          <p className="text-xs text-muted-foreground">{issuer.ticker_symbol}</p>
        )}
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
});

export default function BrokerDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, loading: authLoading, initialized } = useAuth();

  // ⚡ TanStack Query for transfer requests with caching
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: brokerQueryKeys.transferRequests,
    queryFn: () => fetcher("/api/transfer-requests"),
    enabled: initialized && userRole === "broker",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // ⚡ Hover prefetch handler
  const handleIssuerHover = useCallback((issuerId) => {
    // Prefetch the route
    router.prefetch(`/information/${issuerId}`);

    // Prefetch issuer data
    queryClient.prefetchQuery({
      queryKey: brokerQueryKeys.issuerData(issuerId),
      queryFn: () => fetcher(`/api/issuers/${issuerId}`),
      staleTime: 5 * 60 * 1000,
    });
  }, [router, queryClient]);

  // ⚡ Compute stats from cached data
  const stats = useMemo(() => {
    if (!requestsData) return { total: 0, pending: 0, completed: 0, rejected: 0 };

    const requestsList = Array.isArray(requestsData) ? requestsData : [];
    return {
      total: requestsList.length,
      pending: requestsList.filter(r => r.status === "Pending" || r.status === "Under Review").length,
      completed: requestsList.filter(r => r.status === "Completed").length,
      rejected: requestsList.filter(r => r.status === "Rejected").length
    };
  }, [requestsData]);

  // ⚡ Reuse availableIssuers from AuthContext & filter active issuers
  const activeIssuers = useMemo(() => {
    if (!availableIssuers) return [];
    return availableIssuers.filter(issuer => {
      const status = issuer.status || 'active';
      return status !== 'pending' && status !== 'suspended';
    });
  }, [availableIssuers]);

  // Redirect non-brokers using useEffect to avoid calling setState during render
  useEffect(() => {
    if (initialized && !authLoading) {
      if (!user) {
        router.push("/login");
      } else if (userRole !== "broker") {
        router.push("/");
      }
    }
  }, [initialized, authLoading, user, userRole, router]);

  // Show loading or redirect if not a broker
  if (!initialized || authLoading || !user || userRole !== "broker") {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            userRole={userRole}
            currentIssuer={currentIssuer}
            availableIssuers={availableIssuers}
            issuerSpecificRole={issuerSpecificRole}
          />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }


  const isLoading = requestsLoading || !availableIssuers;

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          userRole={userRole}
          currentIssuer={currentIssuer}
          availableIssuers={availableIssuers}
          issuerSpecificRole={issuerSpecificRole}
        />

        <main className="flex-1 overflow-y-auto p-5">
          <div className="max-w-7xl mx-auto px-6">
            {/* Stats Cards - Memoized */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard label="Total Requests" value={stats.total} />
              <StatsCard label="Pending" value={stats.pending} colorClass="text-amber-600" />
              <StatsCard label="Completed" value={stats.completed} colorClass="text-green-600" />
              <StatsCard label="Rejected" value={stats.rejected} colorClass="text-destructive" />
            </div>

            {/* Available Issuers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Available Issuers
                </CardTitle>
                <CardDescription>Issuers you can view and submit requests for</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : activeIssuers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active issuers available</p>
                    <p className="text-sm mt-1">Contact an administrator for assistance</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeIssuers.map((issuer) => (
                      <IssuerCard
                        key={issuer.issuer_id || issuer.id}
                        issuer={issuer}
                        onHover={handleIssuerHover}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
