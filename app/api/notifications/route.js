import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/services/notification-service';

/**
 * GET /api/notifications
 * Fetch notifications for the current user
 * Query params:
 *   - unreadOnly: boolean - only fetch unread notifications
 *   - limit: number - max number of notifications to return (default 50)
 */
export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build query
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(Math.min(limit, 100)); // Cap at 100

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Failed to fetch notifications:', error);
            throw error;
        }

        return NextResponse.json(data || [], { status: 200 });
    } catch (err) {
        console.error('GET /api/notifications error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 * Body:
 *   - notificationId: string - single notification to mark as read
 *   - markAll: boolean - mark all notifications as read
 */
export async function PATCH(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { notificationId, markAll } = body;

        if (markAll) {
            // Mark all notifications as read
            const result = await markAllNotificationsRead(user.id);

            if (!result.success) {
                throw new Error(result.error || 'Failed to mark all as read');
            }

            return NextResponse.json({
                success: true,
                count: result.count
            }, { status: 200 });
        } else if (notificationId) {
            // Mark single notification as read
            const result = await markNotificationRead(notificationId, user.id);

            if (!result.success) {
                throw new Error(result.error || 'Failed to mark notification as read');
            }

            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            return NextResponse.json({
                error: 'Must provide either notificationId or markAll'
            }, { status: 400 });
        }
    } catch (err) {
        console.error('PATCH /api/notifications error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/notifications
 * Delete a notification
 * Body:
 *   - notificationId: string - notification to delete
 */
export async function DELETE(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const notificationId = searchParams.get('id');

        if (!notificationId) {
            return NextResponse.json({
                error: 'Notification ID required'
            }, { status: 400 });
        }

        // Delete notification (RLS ensures user can only delete their own)
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Failed to delete notification:', error);
            throw error;
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error('DELETE /api/notifications error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
