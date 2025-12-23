"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * Custom hook for real-time notifications using Supabase Realtime
 * Listens for new notifications and shows toast popups
 *
 * @param {string} userId - The current user's ID
 * @param {Function} onNewNotification - Callback when new notification arrives
 * @returns {Object} - { unreadCount, notifications, markAsRead, markAllAsRead }
 */
export function useRealtimeNotifications(userId, onNewNotification) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Store callback in ref to avoid infinite loop from dependency changes
    const onNewNotificationRef = useRef(onNewNotification);
    useEffect(() => {
        onNewNotificationRef.current = onNewNotification;
    }, [onNewNotification]);

    useEffect(() => {
        if (!userId) return;

        const supabase = createClient();

        // Initial fetch of notifications
        const fetchInitialNotifications = async () => {
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) throw error;

                setNotifications(data || []);
                setUnreadCount(data?.filter(n => !n.is_read).length || 0);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialNotifications();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('🔔 New notification received:', payload.new);

                    const newNotification = payload.new;

                    // Add to notifications list
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show toast popup
                    toast(newNotification.title, {
                        description: newNotification.message,
                        action: newNotification.action_url ? {
                            label: 'View',
                            onClick: () => {
                                window.location.href = newNotification.action_url;
                            }
                        } : undefined,
                        duration: 5000,
                    });

                    // Call callback if provided (use ref to avoid stale closure)
                    if (onNewNotificationRef.current) {
                        onNewNotificationRef.current(newNotification);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('📝 Notification updated:', payload.new);

                    // Update notification in list
                    setNotifications(prev =>
                        prev.map(n => n.id === payload.new.id ? payload.new : n)
                    );

                    // Update unread count
                    if (payload.new.is_read && !payload.old.is_read) {
                        setUnreadCount(prev => Math.max(0, prev - 1));
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]); // Only depend on userId - callback is stored in ref

    /**
     * Mark a notification as read
     */
    const markAsRead = async (notificationId) => {
        try {
            const supabase = createClient();

            const { error } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;

            // Update local state
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    /**
     * Mark all notifications as read
     */
    const markAllAsRead = async () => {
        try {
            const supabase = createClient();

            const { error } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead
    };
}
