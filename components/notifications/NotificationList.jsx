"use client";

import { formatDistanceToNow } from 'date-fns';
import { FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Notification List Component
 * Displays a list of notifications in a scrollable area
 */
export default function NotificationList({
    notifications,
    loading,
    onMarkAsRead,
    onMarkAllAsRead
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
            <div className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="flex flex-col max-h-[500px]">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-base">Notifications</h3>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkAllAsRead}
                        className="text-xs"
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Notification List */}
            <ScrollArea className="flex-1">
                {notifications.map((notification) => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                    />
                ))}
            </ScrollArea>
        </div>
    );
}

/**
 * Individual Notification Item
 */
function NotificationItem({ notification, onMarkAsRead }) {
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
            className={`block p-4 border-b hover:bg-muted/50 dark:hover:bg-muted transition-colors ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600 dark:border-l-blue-400' : ''
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1 flex-shrink-0">
                    {getIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                </div>

                {/* Unread indicator */}
                {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                )}
            </div>
        </Link>
    );
}

// Import Bell for empty state
function Bell({ className }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
        </svg>
    );
}
