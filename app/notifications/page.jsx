"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import NotificationList from "@/components/notifications/NotificationList";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
    const { user, userRole, currentIssuer, availableIssuers, issuerSpecificRole, userRoles, initialized } = useAuth();
    const [userId, setUserId] = useState(null);
    const router = useRouter();

    useEffect(() => {
        if (user) {
            setUserId(user.id);
        }
    }, [user]);

    const {
        notifications,
        loading,
        markAsRead,
        markAllAsRead
    } = useRealtimeNotifications(userId);

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
        );
    }

    return (
        <div className="flex h-screen bg-background">
            <Sidebar
                userRole={userRole}
                currentIssuerId={currentIssuer?.issuer_id}
                issuerSpecificRole={issuerSpecificRole}
            />

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
                    <div className="py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="max-w-[1000px] mx-auto px-6">
                            <Button
                                onClick={() => router.back()}
                                variant="ghost"
                                className="mb-4 hover:bg-muted transition-all duration-200 group"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                                Back
                            </Button>
                            <div className="bg-background rounded-xl shadow-sm border border-border/50 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                <NotificationList
                                    notifications={notifications}
                                    loading={loading}
                                    onMarkAsRead={markAsRead}
                                    onMarkAllAsRead={markAllAsRead}
                                    isFullPage={true}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
