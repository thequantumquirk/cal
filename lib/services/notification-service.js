import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend-client';
import { render } from '@react-email/render';
import BrokerRequestSubmittedEmail from '@/lib/email/templates/broker-request-submitted';

/**
 * Send notifications when a broker submits a transfer request
 * Creates in-app notifications and sends emails to all admin users
 * 
 * @param {Object} request - The transfer request object
 * @param {Object} broker - The broker who submitted the request
 * @param {Object} issuer - The issuer for this request
 * @param {Request} httpRequest - The HTTP request object (for getting base URL)
 * @returns {Promise<{success: boolean, emailsSent: number, emailsFailed: number, notificationsCreated: number}>}
 */
export async function notifyBrokerRequestSubmitted(request, broker, issuer, httpRequest) {
    console.log('📧 [NOTIF-SERVICE] ========== START ==========');
    console.log('📧 [NOTIF-SERVICE] Request ID:', request.id);
    console.log('📧 [NOTIF-SERVICE] Request Number:', request.request_number);
    console.log('📧 [NOTIF-SERVICE] Broker:', broker.email);
    console.log('📧 [NOTIF-SERVICE] Issuer:', issuer.issuer_name);

    try {
        const supabase = await createClient();
        console.log('📧 [NOTIF-SERVICE] ✅ Supabase client created');

        // 1. Get all admin users who should be notified
        console.log('📧 [NOTIF-SERVICE] Fetching admin users (using is_super_admin)...');
        const { data: adminUsers, error: adminError } = await supabase
            .from('users_new')
            .select('id, email, name, is_super_admin')
            .eq('is_super_admin', true);

        if (adminError) {
            console.error('📧 [NOTIF-SERVICE] ❌ Failed to fetch admin users:', adminError);
            return {
                success: false,
                error: 'Failed to fetch admin users',
                emailsSent: 0,
                emailsFailed: 0,
                notificationsCreated: 0
            };
        }

        console.log('📧 [NOTIF-SERVICE] Admin users query result:', adminUsers);
        console.log('📧 [NOTIF-SERVICE] Admin users count:', adminUsers?.length || 0);

        if (!adminUsers || adminUsers.length === 0) {
            console.error('📧 [NOTIF-SERVICE] ❌ No admin users found with is_super_admin = true');
            return {
                success: false,
                error: 'No admin users found',
                emailsSent: 0,
                emailsFailed: 0,
                notificationsCreated: 0
            };
        }

        // 2. Build the action URL dynamically from request headers
        console.log('📧 [NOTIF-SERVICE] Building action URL...');
        let baseUrl;
        if (httpRequest) {
            const host = httpRequest.headers.get('host');
            const protocol = httpRequest.headers.get('x-forwarded-proto') || 'http';
            baseUrl = `${protocol}://${host}`;
            console.log('📧 [NOTIF-SERVICE] Base URL from request:', baseUrl);
        } else {
            baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            console.log('📧 [NOTIF-SERVICE] Base URL from env:', baseUrl);
        }

        const requestUrl = `${baseUrl}/information/${issuer.id}`;
        console.log('📧 [NOTIF-SERVICE] Action URL:', requestUrl);

        // 3. Create in-app notifications for each admin
        console.log('📧 [NOTIF-SERVICE] Creating in-app notifications...');
        const notifications = adminUsers.map(admin => ({
            user_id: admin.id,
            type: 'broker_request_submitted',
            title: `New Transfer Request #${request.request_number}`,
            message: `${broker.name || broker.email} submitted a ${request.request_type} request for ${request.shareholder_name} (${request.quantity.toLocaleString()} shares)`,
            entity_type: 'transfer_request',
            entity_id: request.id,
            action_url: requestUrl
        }));

        console.log('📧 [NOTIF-SERVICE] Notifications to insert:', notifications.length);
        console.log('📧 [NOTIF-SERVICE] Sample notification:', notifications[0]);

        // Insert notifications (RLS is disabled, so regular client works)
        console.log('📧 [NOTIF-SERVICE] Inserting into notifications table...');
        const { error: notifError, data: createdNotifs } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (notifError) {
            console.error('📧 [NOTIF-SERVICE] ❌ Failed to create in-app notifications:', notifError);
            console.error('📧 [NOTIF-SERVICE] Error details:', JSON.stringify(notifError, null, 2));
        } else {
            console.log('📧 [NOTIF-SERVICE] ✅ Notifications inserted successfully!');
            console.log('📧 [NOTIF-SERVICE] Created notifications:', createdNotifs);
        }

        const notificationsCreated = createdNotifs?.length || 0;
        console.log('📧 [NOTIF-SERVICE] Total notifications created:', notificationsCreated);

        // 4. Send email notifications (with rate limiting for Resend free tier)
        console.log('📧 [NOTIF-SERVICE] Sending email notifications...');

        // Limit emails for testing (Resend free tier: 2 requests/second)
        const MAX_EMAILS = process.env.MAX_NOTIFICATION_EMAILS
            ? parseInt(process.env.MAX_NOTIFICATION_EMAILS)
            : 2; // Default to 2 for testing

        const emailRecipients = adminUsers.slice(0, MAX_EMAILS);
        console.log(`📧 [NOTIF-SERVICE] Limiting to ${MAX_EMAILS} emails (${adminUsers.length} total admins)`);

        let emailSuccessCount = 0;
        let emailFailCount = 0;

        for (const admin of emailRecipients) {
            try {
                const emailHtml = render(
                    BrokerRequestSubmittedEmail({
                        requestNumber: request.request_number,
                        brokerName: broker.name || broker.email,
                        issuerName: issuer.issuer_name,
                        requestType: request.request_type,
                        quantity: request.quantity,
                        securityType: request.security_type,
                        actionUrl: requestUrl
                    })
                );

                await sendEmail({
                    to: admin.email,
                    subject: `New Transfer Request #${request.request_number}`,
                    html: emailHtml
                });

                console.log(`📧 [NOTIF-SERVICE] ✅ Email sent to ${admin.email}`);
                emailSuccessCount++;

                // Add 600ms delay between emails to respect rate limit (2 req/sec)
                if (emailRecipients.indexOf(admin) < emailRecipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            } catch (err) {
                console.error(`📧 [NOTIF-SERVICE] ❌ Failed to send email to ${admin.email}:`, err.message);
                emailFailCount++;
            }
        }

        console.log(`📧 [NOTIF-SERVICE] Email results: { successCount: ${emailSuccessCount}, failCount: ${emailFailCount} }`);
        console.log('📧 [NOTIF-SERVICE] ========== END ==========');

        return {
            success: true,
            emailsSent: emailSuccessCount,
            emailsFailed: emailFailCount,
            notificationsCreated
        };
    } catch (err) {
        console.error('📧 [NOTIF-SERVICE] ❌ FATAL ERROR:', err);
        console.error('📧 [NOTIF-SERVICE] Error stack:', err.stack);
        console.error('📧 [NOTIF-SERVICE] ========== END (ERROR) ==========');
        return {
            success: false,
            error: err.message,
            emailsSent: 0,
            emailsFailed: 0,
            notificationsCreated: 0
        };
    }
}

/**
 * Mark a notification as read
 * 
 * @param {string} notificationId - The notification ID
 * @param {string} userId - The user ID (for security check)
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export async function markNotificationRead(notificationId, userId) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', userId); // Security: only user can mark their own notifications

        if (error) {
            console.error('Failed to mark notification as read:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (err) {
        console.error('Mark notification read error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Mark all notifications as read for a user
 * 
 * @param {string} userId - The user ID
 * @returns {Promise<{success: boolean, count: number, error?: any}>}
 */
export async function markAllNotificationsRead(userId) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_read', false)
            .select();

        if (error) {
            console.error('Failed to mark all notifications as read:', error);
            return { success: false, count: 0, error };
        }

        return { success: true, count: data?.length || 0 };
    } catch (err) {
        console.error('Mark all notifications read error:', err);
        return { success: false, count: 0, error: err.message };
    }
}

/**
 * Get unread notification count for a user
 * 
 * @param {string} userId - The user ID
 * @returns {Promise<{count: number, error?: any}>}
 */
export async function getUnreadCount(userId) {
    try {
        const supabase = await createClient();

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Failed to get unread count:', error);
            return { count: 0, error };
        }

        return { count: count || 0 };
    } catch (err) {
        console.error('Get unread count error:', err);
        return { count: 0, error: err.message };
    }
}

/**
 * Delete old read notifications (cleanup)
 * 
 * @param {number} daysOld - Delete notifications older than this many days
 * @returns {Promise<{success: boolean, deleted: number, error?: any}>}
 */
export async function deleteOldNotifications(daysOld = 30) {
    try {
        const supabase = await createClient();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('is_read', true)
            .lt('read_at', cutoffDate.toISOString())
            .select();

        if (error) {
            console.error('Failed to delete old notifications:', error);
            return { success: false, deleted: 0, error };
        }

        return { success: true, deleted: data?.length || 0 };
    } catch (err) {
        console.error('Delete old notifications error:', err);
        return { success: false, deleted: 0, error: err.message };
    }
}
