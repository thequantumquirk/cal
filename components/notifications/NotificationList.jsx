"use client";

import { formatDistanceToNow } from 'date-fns';
import { FileText, CheckCircle2, Trash2, Maximize2, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/empty-state';

/**
 * Notification List Component
 * Displays a list of notifications in a scrollable area
 */
export default function NotificationList({
    notifications,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    isFullPage = false
}) {
    if (loading) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground">
                <div className="animate-pulse">Loading notifications...</div>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <EmptyState
                icon={Bell}
                title="All Caught Up!"
                description="You have no new notifications. We'll notify you when something important happens."
                showAction={false}
                size={isFullPage ? "lg" : "sm"}
            />
        );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className={`flex flex-col ${isFullPage ? '' : 'max-h-[500px]'}`}>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">Notifications</h3>
                    {!isFullPage && (
                        <Link
                            href="/notifications"
                            className="p-1.5 hover:bg-muted rounded-md transition-all duration-200 hover:scale-110 group"
                            title="Expand to full page"
                        >
                            <Maximize2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkAllAsRead}
                        className="text-xs hover:bg-primary/10 transition-all duration-200"
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Notification List */}
            <ScrollArea className="flex-1">
                <div className="divide-y">
                    {notifications.map((notification, index) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={onMarkAsRead}
                            isFullPage={isFullPage}
                            index={index}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

/**
 * Individual Notification Item
 */
function NotificationItem({ notification, onMarkAsRead, isFullPage, index }) {
    const handleClick = () => {
        if (!notification.is_read) {
            onMarkAsRead(notification.id);
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'broker_request_submitted':
                return <FileText className="h-5 w-5 text-blue-600" />;
            case 'request_status_changed':
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            default:
                return <FileText className="h-5 w-5 text-gray-600" />;
        }
    };

    return (
        <Link
            href={notification.action_url || '#'}
            onClick={handleClick}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`block p-4 hover:bg-muted/50 dark:hover:bg-muted transition-all duration-300 animate-in fade-in slide-in-from-top-2 group ${
                !notification.is_read
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-600 dark:border-l-blue-400'
                    : 'hover:border-l-4 hover:border-l-transparent'
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1 flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                    {getIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm transition-colors ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                    </p>
                    <p className={`text-sm text-muted-foreground mt-1 ${isFullPage ? '' : 'line-clamp-2'}`}>
                        {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                </div>

                {/* Unread indicator */}
                {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                )}
            </div>
        </Link>
    );
}

// Bell icon component for empty state (using lucide-react Bell instead)
const BellIcon = Bell;
