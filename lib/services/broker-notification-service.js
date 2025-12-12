import { createClient } from '@/lib/supabase/server';

/**
 * Notify broker when request status changes
 */
export async function notifyBrokerOfStatusChange(request, newStatus, admin, broker, httpRequest) {
    console.log('📧 [BROKER-NOTIF] Notifying broker of status change:', newStatus);

    try {
        const supabase = await createClient();

        // Build action URL
        let baseUrl;
        if (httpRequest) {
            const host = httpRequest.headers.get('host');
            const protocol = httpRequest.headers.get('x-forwarded-proto') || 'http';
            baseUrl = `${protocol}://${host}`;
        } else {
            baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        }

        const requestUrl = `${baseUrl}/information/${request.issuer_id}`;

        // Create notification
        const notification = {
            user_id: broker.id,
            type: 'request_status_changed',
            title: `Request #${request.request_number} ${newStatus}`,
            message: `Your ${request.request_type} request has been ${newStatus.toLowerCase()} by ${admin.name || 'admin'}`,
            entity_type: 'transfer_request',
            entity_id: request.id,
            action_url: requestUrl
        };

        const { error } = await supabase
            .from('notifications')
            .insert([notification]);

        if (error) {
            console.error('📧 [BROKER-NOTIF] Failed to create notification:', error);
            return { success: false, error };
        }

        console.log('📧 [BROKER-NOTIF] ✅ Broker notified of status change');
        return { success: true };
    } catch (err) {
        console.error('📧 [BROKER-NOTIF] Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Notify broker when admin adds a comment
 */
export async function notifyBrokerOfComment(request, comment, admin, broker, httpRequest) {
    console.log('📧 [BROKER-NOTIF] Notifying broker of new comment');

    try {
        const supabase = await createClient();

        // Build action URL
        let baseUrl;
        if (httpRequest) {
            const host = httpRequest.headers.get('host');
            const protocol = httpRequest.headers.get('x-forwarded-proto') || 'http';
            baseUrl = `${protocol}://${host}`;
        } else {
            baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        }

        const requestUrl = `${baseUrl}/information/${request.issuer_id}`;

        // Create notification
        const notification = {
            user_id: broker.id,
            type: 'admin_comment_added',
            title: `New Comment on Request #${request.request_number}`,
            message: `${admin.name || 'Admin'} commented: "${comment.message.substring(0, 100)}${comment.message.length > 100 ? '...' : ''}"`,
            entity_type: 'transfer_request',
            entity_id: request.id,
            action_url: requestUrl
        };

        const { error } = await supabase
            .from('notifications')
            .insert([notification]);

        if (error) {
            console.error('📧 [BROKER-NOTIF] Failed to create notification:', error);
            return { success: false, error };
        }

        console.log('📧 [BROKER-NOTIF] ✅ Broker notified of comment');
        return { success: true };
    } catch (err) {
        console.error('📧 [BROKER-NOTIF] Error:', err);
        return { success: false, error: err.message };
    }
}
