import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

/**
 * GET - Handle email action links (approve/reject)
 * Redirects to appropriate pages after validating the token
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");
        const action = searchParams.get("action");

        // Validate parameters
        if (!token) {
            return NextResponse.redirect(new URL('/error?message=Missing%20action%20token', request.url));
        }

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.redirect(new URL('/error?message=Invalid%20action', request.url));
        }

        const supabase = await createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            // Redirect to login with return URL
            const returnUrl = encodeURIComponent(request.url);
            return NextResponse.redirect(new URL(`/login?returnUrl=${returnUrl}`, request.url));
        }

        // Verify user is admin
        const userRole = await getCurrentUserRole();
        if (userRole !== 'admin' && userRole !== 'superadmin') {
            return NextResponse.redirect(new URL('/error?message=Unauthorized%20-%20Admin%20access%20required', request.url));
        }

        // Find the request by action token
        const { data: transferRequest, error: requestError } = await supabase
            .from("transfer_agent_requests")
            .select("*")
            .eq("action_token", token)
            .single();

        if (requestError || !transferRequest) {
            console.error("Token lookup error:", requestError);
            return NextResponse.redirect(new URL('/error?message=Invalid%20or%20expired%20token', request.url));
        }

        // Check if token is expired
        if (transferRequest.action_token_expires_at) {
            const expiresAt = new Date(transferRequest.action_token_expires_at);
            if (expiresAt < new Date()) {
                return NextResponse.redirect(new URL('/error?message=Action%20token%20has%20expired', request.url));
            }
        }

        // Check if token was already used
        if (transferRequest.action_token_used_at) {
            return NextResponse.redirect(new URL('/error?message=This%20action%20has%20already%20been%20processed', request.url));
        }

        // Handle based on action type
        if (action === 'approve') {
            // Redirect to transaction processing page with prepopulated data
            const baseUrl = new URL(request.url).origin;
            const transactionUrl = new URL(`/broker-action/approve`, baseUrl);
            transactionUrl.searchParams.set('requestId', transferRequest.id);
            transactionUrl.searchParams.set('token', token);

            return NextResponse.redirect(transactionUrl);
        } else if (action === 'reject') {
            // Redirect to rejection page
            const baseUrl = new URL(request.url).origin;
            const rejectUrl = new URL(`/broker-action/reject`, baseUrl);
            rejectUrl.searchParams.set('requestId', transferRequest.id);
            rejectUrl.searchParams.set('token', token);

            return NextResponse.redirect(rejectUrl);
        }

        // Fallback
        return NextResponse.redirect(new URL('/error?message=Unknown%20action', request.url));
    } catch (err) {
        console.error("Action handler error:", err);
        return NextResponse.redirect(new URL(`/error?message=${encodeURIComponent(err.message)}`, request.url));
    }
}

/**
 * POST - Process the approve/reject action
 * Called from the approve/reject pages after admin confirms
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getCurrentUserRole();
        if (userRole !== 'admin' && userRole !== 'superadmin') {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { requestId, token, action, rejectionReason } = body;

        if (!requestId || !token || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify token matches request
        const { data: transferRequest, error: requestError } = await supabase
            .from("transfer_agent_requests")
            .select("*")
            .eq("id", requestId)
            .eq("action_token", token)
            .single();

        if (requestError || !transferRequest) {
            return NextResponse.json({ error: "Invalid request or token" }, { status: 400 });
        }

        // Check token expiry
        if (transferRequest.action_token_expires_at) {
            const expiresAt = new Date(transferRequest.action_token_expires_at);
            if (expiresAt < new Date()) {
                return NextResponse.json({ error: "Token has expired" }, { status: 400 });
            }
        }

        // Check if already used
        if (transferRequest.action_token_used_at) {
            return NextResponse.json({ error: "Action already processed" }, { status: 400 });
        }

        // Process the action
        const now = new Date().toISOString();
        let updateData = {
            action_token_used_at: now,
            updated_at: now
        };

        if (action === 'approve') {
            updateData.status = 'Approved';
            updateData.approved_at = now;
            updateData.approved_by = user.id;
        } else if (action === 'reject') {
            if (!rejectionReason) {
                return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
            }
            updateData.status = 'Rejected';
            updateData.rejected_at = now;
            updateData.rejected_by = user.id;
            updateData.rejection_reason = rejectionReason;
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Update the request
        const { data: updatedRequest, error: updateError } = await supabase
            .from("transfer_agent_requests")
            .update(updateData)
            .eq("id", requestId)
            .select()
            .single();

        if (updateError) {
            console.error("Update error:", updateError);
            return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
        }

        // Update action tracking record
        await supabase
            .from("broker_request_actions")
            .update({
                action_type: action,
                used_at: now,
                used_by: user.id,
                rejection_reason: rejectionReason || null
            })
            .eq("request_id", requestId)
            .eq("action_token", token);

        // Add communication record
        await supabase
            .from("transfer_request_communications")
            .insert({
                request_id: requestId,
                user_id: user.id,
                message: action === 'approve'
                    ? `Request approved via email action link.`
                    : `Request rejected via email action link. Reason: ${rejectionReason}`,
                is_internal: false
            });

        // Only notify broker on REJECTION (not on approve - broker will be notified after transaction is processed)
        if (action === 'reject' && updatedRequest.broker_id) {
            console.log('📧 [REJECTION] Notifying broker of rejection...');
            console.log('📧 [REJECTION] Broker ID:', updatedRequest.broker_id);

            try {
                const [brokerData, adminData] = await Promise.all([
                    supabase.from('users_new').select('id, name, email').eq('id', updatedRequest.broker_id).single(),
                    supabase.from('users_new').select('id, name, email').eq('id', user.id).single()
                ]);

                console.log('📧 [REJECTION] Broker data:', brokerData.data);
                console.log('📧 [REJECTION] Admin data:', adminData.data);

                if (brokerData.data && adminData.data) {
                    const { notifyBrokerSplitStatusChange } = await import('@/lib/services/broker-split-notification-service');
                    const result = await notifyBrokerSplitStatusChange(
                        updatedRequest,
                        updateData.status,
                        adminData.data,
                        brokerData.data,
                        rejectionReason
                    );
                    console.log('📧 [REJECTION] Notification result:', result);
                } else {
                    console.warn('📧 [REJECTION] ⚠️ Missing broker or admin data, cannot send notification');
                }
            } catch (notifyErr) {
                console.error('📧 [REJECTION] ❌ Failed to notify broker:', notifyErr);
                // Don't fail the request if notification fails
            }
        }

        // Note: For approve action, broker will be notified AFTER the transaction is processed
        // This is handled in the transaction processing page

        return NextResponse.json({
            success: true,
            action: action,
            request: updatedRequest
        }, { status: 200 });

    } catch (err) {
        console.error("Action POST error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
