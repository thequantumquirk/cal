import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend-client';
import { render } from '@react-email/render';
import BrokerSplitRequestEmail from '@/lib/email/templates/broker-split-request-email';

/**
 * Send notifications when a broker submits a split request
 * Creates in-app notifications and sends emails with approve/reject buttons to admin users
 *
 * @param {Object} request - The broker split request object
 * @param {Object} broker - The broker who submitted the request
 * @param {Object} issuer - The issuer for this request
 * @param {string} actionToken - The secure token for email action buttons
 * @param {Request} httpRequest - The HTTP request object (for getting base URL)
 * @returns {Promise<{success: boolean, emailsSent: number, emailsFailed: number, notificationsCreated: number}>}
 */
export async function notifyBrokerSplitRequestSubmitted(request, broker, issuer, actionToken, httpRequest) {
    console.log('📧 [BROKER-SPLIT-NOTIF] ========== START ==========');
    console.log('📧 [BROKER-SPLIT-NOTIF] Request ID:', request.id);
    console.log('📧 [BROKER-SPLIT-NOTIF] Request Number:', request.request_number);
    console.log('📧 [BROKER-SPLIT-NOTIF] Broker:', broker.email);
    console.log('📧 [BROKER-SPLIT-NOTIF] Issuer:', issuer.issuer_name);
    console.log('📧 [BROKER-SPLIT-NOTIF] Action Token:', actionToken ? `${actionToken.substring(0, 8)}...` : 'MISSING');

    try {
        const supabase = await createClient();
        console.log('📧 [BROKER-SPLIT-NOTIF] ✅ Supabase client created');

        // 1. Get all admin users who should be notified
        console.log('📧 [BROKER-SPLIT-NOTIF] Fetching admin users...');
        const { data: adminUsers, error: adminError } = await supabase
            .from('users_new')
            .select('id, email, name, is_super_admin')
            .eq('is_super_admin', true);

        if (adminError) {
            console.error('📧 [BROKER-SPLIT-NOTIF] ❌ Failed to fetch admin users:', adminError);
            return {
                success: false,
                error: 'Failed to fetch admin users',
                emailsSent: 0,
                emailsFailed: 0,
                notificationsCreated: 0
            };
        }

        console.log('📧 [BROKER-SPLIT-NOTIF] Admin users count:', adminUsers?.length || 0);

        if (!adminUsers || adminUsers.length === 0) {
            console.error('📧 [BROKER-SPLIT-NOTIF] ❌ No admin users found');
            return {
                success: false,
                error: 'No admin users found',
                emailsSent: 0,
                emailsFailed: 0,
                notificationsCreated: 0
            };
        }

        // 2. Build URLs dynamically from request headers
        console.log('📧 [BROKER-SPLIT-NOTIF] Building action URLs...');
        let baseUrl;
        if (httpRequest) {
            const host = httpRequest.headers.get('host');
            const protocol = httpRequest.headers.get('x-forwarded-proto') || 'http';
            baseUrl = `${protocol}://${host}`;
        } else {
            baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        }

        const viewRequestUrl = `${baseUrl}/information/${issuer.id}?requestId=${request.id}`;
        const approveUrl = `${baseUrl}/api/transfer-requests/action?token=${actionToken}&action=approve`;
        const rejectUrl = `${baseUrl}/api/transfer-requests/action?token=${actionToken}&action=reject`;
        const logoUrl = `${baseUrl}/final.png`;

        console.log('📧 [BROKER-SPLIT-NOTIF] View URL:', viewRequestUrl);
        console.log('📧 [BROKER-SPLIT-NOTIF] Approve URL:', approveUrl);
        console.log('📧 [BROKER-SPLIT-NOTIF] Reject URL:', rejectUrl);

        // 3. Create in-app notifications for each admin
        console.log('📧 [BROKER-SPLIT-NOTIF] Creating in-app notifications...');

        const warrantsLabel = issuer.split_security_type === 'Right' ? 'Rights' : 'Warrants';
        const unitsQty = request.units_quantity || request.quantity || 0;
        const classAQty = request.class_a_shares_quantity || unitsQty;
        const warrantsQty = request.warrants_rights_quantity || unitsQty;

        const notifications = adminUsers.map(admin => ({
            user_id: admin.id,
            type: 'broker_split_request',
            title: `New Broker Split Request #${request.request_number}`,
            message: `${broker.name || broker.email} (DTC #${request.dtc_participant_number}) submitted a split request: ${unitsQty.toLocaleString()} Units → ${classAQty.toLocaleString()} Class A + ${warrantsQty.toLocaleString()} ${warrantsLabel}`,
            entity_type: 'transfer_request',
            entity_id: request.id,
            action_url: viewRequestUrl
        }));

        const { error: notifError, data: createdNotifs } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (notifError) {
            console.error('📧 [BROKER-SPLIT-NOTIF] ❌ Failed to create notifications:', notifError);
        } else {
            console.log('📧 [BROKER-SPLIT-NOTIF] ✅ Notifications created:', createdNotifs?.length || 0);
        }

        const notificationsCreated = createdNotifs?.length || 0;

        // 4. Send email notifications with approve/reject buttons
        console.log('📧 [BROKER-SPLIT-NOTIF] Sending email notifications...');

        const MAX_EMAILS = process.env.MAX_NOTIFICATION_EMAILS
            ? parseInt(process.env.MAX_NOTIFICATION_EMAILS)
            : 5;

        const emailRecipients = adminUsers.slice(0, MAX_EMAILS);
        console.log(`📧 [BROKER-SPLIT-NOTIF] Sending to ${emailRecipients.length} admins`);

        let emailSuccessCount = 0;
        let emailFailCount = 0;

        for (const admin of emailRecipients) {
            try {
                const emailHtml = render(
                    BrokerSplitRequestEmail({
                        requestNumber: request.request_number,
                        // Broker Information
                        brokerName: broker.name || broker.email,
                        brokerEmail: broker.email,
                        brokerCompany: broker.company || '',
                        dtcParticipantNumber: request.dtc_participant_number,
                        dwacSubmitted: request.dwac_submitted || false,
                        // Issuer Information
                        issuerName: issuer.issuer_name,
                        // Split Details - All 3 Securities
                        unitsQuantity: unitsQty,
                        classAQuantity: classAQty,
                        warrantsQuantity: warrantsQty,
                        unitsCusip: request.units_cusip || request.cusip || 'N/A',
                        classACusip: request.class_a_cusip || 'N/A',
                        warrantsCusip: request.warrants_cusip || 'N/A',
                        warrantsLabel: warrantsLabel,
                        // Special Instructions
                        specialInstructions: request.special_instructions || '',
                        // Dates
                        submittedDate: new Date(request.created_at || new Date()).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        // Action URLs
                        approveUrl: approveUrl,
                        rejectUrl: rejectUrl,
                        viewRequestUrl: viewRequestUrl,
                        // Logo
                        logoUrl: logoUrl
                    })
                );

                // Generate plain text version
                const emailText = `New Broker Split Request #${request.request_number}

BROKER INFORMATION:
- Broker: ${broker.name || broker.email}
- Email: ${broker.email}
${broker.company ? `- Company: ${broker.company}\n` : ''}- DTC Participant #: ${request.dtc_participant_number}
- DWAC Submitted: ${request.dwac_submitted ? 'Yes' : 'No'}

SPLIT REQUEST DETAILS:
- Issuer: ${issuer.issuer_name}

UNITS (DEBIT):
- Quantity: -${unitsQty.toLocaleString()}
- CUSIP: ${request.units_cusip || request.cusip || 'N/A'}

CLASS A SHARES (CREDIT):
- Quantity: +${classAQty.toLocaleString()}
- CUSIP: ${request.class_a_cusip || 'N/A'}

${warrantsLabel.toUpperCase()} (CREDIT):
- Quantity: +${warrantsQty.toLocaleString()}
- CUSIP: ${request.warrants_cusip || 'N/A'}

${request.special_instructions ? `SPECIAL INSTRUCTIONS:\n${request.special_instructions}\n\n` : ''}SUBMITTED: ${new Date(request.created_at || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

ACTIONS:
- Approve: ${approveUrl}
- Reject: ${rejectUrl}
- View Full Details: ${viewRequestUrl}

This is an automated notification from Efficiency Team.`;

                await sendEmail({
                    to: admin.email,
                    subject: `Broker Split Request #${request.request_number} - Action Required`,
                    html: emailHtml,
                    text: emailText
                });

                console.log(`📧 [BROKER-SPLIT-NOTIF] ✅ Email sent to ${admin.email}`);
                emailSuccessCount++;

                // Rate limit delay
                if (emailRecipients.indexOf(admin) < emailRecipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            } catch (err) {
                console.error(`📧 [BROKER-SPLIT-NOTIF] ❌ Failed to send email to ${admin.email}:`, err.message);
                emailFailCount++;
            }
        }

        console.log(`📧 [BROKER-SPLIT-NOTIF] Results: { sent: ${emailSuccessCount}, failed: ${emailFailCount} }`);
        console.log('📧 [BROKER-SPLIT-NOTIF] ========== END ==========');

        return {
            success: true,
            emailsSent: emailSuccessCount,
            emailsFailed: emailFailCount,
            notificationsCreated
        };
    } catch (err) {
        console.error('📧 [BROKER-SPLIT-NOTIF] ❌ FATAL ERROR:', err);
        console.error('📧 [BROKER-SPLIT-NOTIF] ========== END (ERROR) ==========');
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
 * Notify broker when their split request status changes
 */
export async function notifyBrokerSplitStatusChange(request, newStatus, admin, broker, rejectionReason = null) {
    console.log('📧 [BROKER-STATUS] Notifying broker of status change:', newStatus);

    try {
        const supabase = await createClient();

        // Create in-app notification for broker
        const statusMessages = {
            'Approved': `Your split request #${request.request_number} has been approved! The transfer agent will process it shortly.`,
            'Rejected': `Your split request #${request.request_number} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
            'Processing': `Your split request #${request.request_number} is now being processed.`,
            'Completed': `Your split request #${request.request_number} has been completed!`
        };

        const message = statusMessages[newStatus] || `Your split request #${request.request_number} status has been updated to: ${newStatus}`;

        await supabase
            .from('notifications')
            .insert({
                user_id: broker.id,
                type: 'split_request_status_change',
                title: `Split Request ${newStatus}`,
                message: message,
                entity_type: 'transfer_request',
                entity_id: request.id,
                action_url: `/information/${request.issuer_id}`
            });

        // Send email to broker
        const emailText = `Your Broker Split Request #${request.request_number}

Status Update: ${newStatus}

${message}

${admin ? `Updated by: ${admin.name || admin.email}` : ''}
${rejectionReason ? `\nRejection Reason: ${rejectionReason}` : ''}

This is an automated notification from Efficiency Team.`;

        // Build base URL for logo
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.useefficiency.com';

        // HTML version of the email
        const statusColor = newStatus === 'Rejected' ? '#dc2626' : newStatus === 'Completed' ? '#16a34a' : '#2563eb';
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                            <img src="${baseUrl}/logo.png" alt="Efficiency" style="height: 50px; max-width: 200px;" />
                        </td>
                    </tr>

                    <!-- Status Badge -->
                    <tr>
                        <td style="padding: 32px 40px 16px 40px; text-align: center;">
                            <span style="display: inline-block; padding: 8px 20px; background-color: ${statusColor}; color: white; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                                ${newStatus}
                            </span>
                        </td>
                    </tr>

                    <!-- Title -->
                    <tr>
                        <td style="padding: 16px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; color: #18181b;">
                                Split Request #${request.request_number}
                            </h1>
                        </td>
                    </tr>

                    <!-- Message -->
                    <tr>
                        <td style="padding: 16px 40px 32px 40px;">
                            <p style="margin: 0; font-size: 16px; color: #3f3f46; line-height: 1.6; text-align: center;">
                                ${message}
                            </p>
                        </td>
                    </tr>

                    ${rejectionReason ? `
                    <!-- Rejection Reason -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase;">
                                    Rejection Reason
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #dc2626;">
                                    ${rejectionReason}
                                </p>
                            </div>
                        </td>
                    </tr>
                    ` : ''}

                    ${admin ? `
                    <!-- Admin Info -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #71717a;">
                                Updated by: <strong>${admin.name || admin.email}</strong>
                            </p>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f4f4f5; text-align: center; border-top: 1px solid #e4e4e7;">
                            <p style="margin: 0; font-size: 12px; color: #71717a;">
                                This is an automated notification from Efficiency Team.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        await sendEmail({
            to: broker.email,
            subject: `Split Request #${request.request_number} - ${newStatus}`,
            html: emailHtml,
            text: emailText
        });

        console.log('📧 [BROKER-STATUS] ✅ Broker notified');
        return { success: true };
    } catch (err) {
        console.error('📧 [BROKER-STATUS] ❌ Error:', err);
        return { success: false, error: err.message };
    }
}
