"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIssuers } from "@/hooks/use-issuer-data";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, X, Building2, ChevronRight, Search } from "lucide-react";
import { normalizeText } from "@/lib/utils";

export default function RecordsManagementHome() {
  const router = useRouter();
  const {
    user,
    userRole,
    currentIssuer,
    availableIssuers,
    issuerSpecificRole,
    loading: authLoading,
    initialized,
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  const isBroker = userRole === "broker";

  // ⚡ TanStack Query - fetches and caches issuers with 1min staleTime
  const { data: issuers = [], isLoading, error: fetchError } = useIssuers();

  const filteredIssuers = issuers.filter((issuer) => {
    const issuerName = issuer.issuer_name || issuer.name || "";
    const matchesSearch = issuerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleIssuerClick = (issuerId) => {
    router.push(`/information/${issuerId}`);
  };

  // ⚡ OPTIMIZED: Progressive loading - show UI structure immediately
  if (!initialized) {
    return (
      <div className="flex h-screen bg-background">
        {!isBroker && (
          <Sidebar
            userRole={userRole}
            currentIssuerId={null}
            issuerSpecificRole={issuerSpecificRole}
          />
        )}

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
              <div className="mb-8">
                <div className="h-10 w-96 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-6 w-full max-w-2xl bg-muted animate-pulse rounded"></div>
              </div>
              <div className="h-10 w-96 bg-muted animate-pulse rounded mb-6"></div>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {!isBroker && (
        <Sidebar
          userRole={userRole}
          currentIssuerId={null}
          issuerSpecificRole={issuerSpecificRole}
        />
      )}

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
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Records Management
              </h1>
              <p className="text-lg text-muted-foreground">
                Select an issuer to view documents, securities administration, and transfer agent requests
              </p>
            </div>

            {(error || fetchError) && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search issuers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xl pl-10"
              />
            </div>

            {/* ⚡ OPTIMIZED: Beautiful skeleton loading state */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-muted rounded-lg"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-6 bg-muted rounded w-48"></div>
                          <div className="h-4 bg-muted rounded w-96"></div>
                        </div>
                        <div className="w-6 h-6 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div>
                {filteredIssuers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      {searchTerm
                        ? "No issuers found matching your search"
                        : "No issuers available"}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredIssuers.map((issuer) => (
                      <Card
                        key={issuer.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group border-border"
                        onClick={() => handleIssuerClick(issuer.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                <Building2 className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                                  {normalizeText(issuer.issuer_name || issuer.name) || "Unknown Issuer"}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {issuer.ticker && (
                                    <span className="font-mono font-medium text-foreground bg-muted px-2 py-0.5 rounded">{issuer.ticker}</span>
                                  )}
                                  {issuer.incorporation_state && (
                                    <span>
                                      <span className="font-medium">State:</span> {issuer.incorporation_state}
                                    </span>
                                  )}
                                  {issuer.authorized_shares && (
                                    <span>
                                      <span className="font-medium">Authorized Shares:</span>{" "}
                                      {issuer.authorized_shares.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
