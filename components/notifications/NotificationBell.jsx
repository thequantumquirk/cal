"use client";

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import NotificationList from './NotificationList';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { createClient } from '@/lib/supabase/client';

/**
 * Notification Bell Component with Real-Time Updates
 * Displays a bell icon with unread count badge
 * Opens a popover with notification list when clicked
 * Shows instant toast notifications when new notifications arrive
 */
export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState(null);

    // Get current user ID
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserId(data.user.id);
            }
        });
    }, []);

    // Use real-time notifications hook
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead
    } = useRealtimeNotifications(userId, (newNotification) => {
        // Optional: Play sound or show additional UI feedback
        console.log('New notification received:', newNotification);
    });

    /**
     * Handle marking notification as read
     */
    const handleMarkAsRead = async (notificationId) => {
        await markAsRead(notificationId);
    };

    /**
     * Handle marking all notifications as read
     */
    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    /**
     * Handle popover open/close
     */
    const handleOpenChange = (open) => {
        setIsOpen(open);
    };

    if (!userId) return null;

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative group"
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                >
                    <Bell className={`h-5 w-5 transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : 'group-hover:scale-110'}`} />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs animate-in zoom-in duration-300"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 animate-in fade-in slide-in-from-top-2 duration-300" align="end">
                <NotificationList
                    notifications={notifications}
                    loading={loading}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                />
            </PopoverContent>
        </Popover>
    );
}
