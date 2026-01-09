import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";
import { checkIssuerTransactionAccess } from "@/lib/issuer-utils";

// GET - Fetch transfer requests
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();
    const { searchParams } = new URL(request.url);
    const issuerId = searchParams.get("issuerId");
    const status = searchParams.get("status");
    const requestId = searchParams.get("requestId");

    // If requesting a single request
    if (requestId) {
      const { data, error } = await supabase
        .from("transfer_agent_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (error) throw error;

      // Check permissions
      if (userRole === "broker" && data.broker_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Fetch related data manually
      const [brokerData, issuerData, assignedData] = await Promise.all([
        data.broker_id ? supabase.from("users_new").select("id, name, email").eq("id", data.broker_id).single() : Promise.resolve({ data: null }),
        data.issuer_id ? supabase.from("issuers").select("id, issuer_name").eq("id", data.issuer_id).single() : Promise.resolve({ data: null }),
        data.assigned_to ? supabase.from("users_new").select("id, name, email").eq("id", data.assigned_to).single() : Promise.resolve({ data: null })
      ]);

      return NextResponse.json({
        ...data,
        broker: brokerData.data,
        issuer: issuerData.data,
        assigned_user: assignedData.data
      }, { status: 200 });
    }

    // Fetch multiple requests
    let query = supabase
      .from("transfer_agent_requests")
      .select("*")
      .order("submitted_at", { ascending: false });

    // Role-based filtering
    if (userRole === "broker") {
      query = query.eq("broker_id", user.id);
    }

    // Filter by issuer if provided
    if (issuerId) {
      query = query.eq("issuer_id", issuerId);
    }

    // Filter by status if provided
    if (status && status !== "All") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || [], { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create new transfer request
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "broker" && userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const {
      issuerId,
      requestType,
      requestPurpose,
      shareholderName,
      accountNumber,
      securityType,
      quantity,
      cusip,
      notes
    } = body;

    // Validation
    if (!issuerId || !requestType || !shareholderName || !accountNumber || !securityType || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if issuer is suspended or pending (transactions blocked for both)
    const transactionAccess = await checkIssuerTransactionAccess(supabase, issuerId);
    if (!transactionAccess.allowed) {
      return NextResponse.json(
        { error: transactionAccess.reason || 'Cannot create transfer requests for this issuer' },
        { status: 403 }
      );
    }

    // Create the request
    const { data: newRequest, error: insertError } = await supabase
      .from("transfer_agent_requests")
      .insert({
        issuer_id: issuerId,
        broker_id: user.id,
        request_type: requestType,
        request_purpose: requestPurpose,
        shareholder_name: shareholderName,
        account_number: accountNumber,
        security_type: securityType,
        quantity: quantity,
        cusip: cusip,
        special_instructions: notes,
        priority: "Normal",
        status: "Pending"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create initial communication
    await supabase
      .from("transfer_request_communications")
      .insert({
        request_id: newRequest.id,
        user_id: user.id,
        message: `Submitted ${requestType} request for review.`,
        is_internal: false
      });

    // 🔔 SEND NOTIFICATIONS TO ADMINS
    console.log('🔔 [NOTIFICATIONS] Starting notification process for request:', newRequest.id);

    // Fetch broker and issuer details for notification
    console.log('🔔 [NOTIFICATIONS] Fetching broker and issuer data...');
    const [brokerData, issuerData] = await Promise.all([
      supabase.from('users_new').select('id, name, email').eq('id', user.id).single(),
      supabase.from('issuers_new').select('id, issuer_name').eq('id', issuerId).single()
    ]);

    console.log('🔔 [NOTIFICATIONS] Broker data:', brokerData.data ? `✅ ${brokerData.data.email}` : '❌ NULL');
    console.log('🔔 [NOTIFICATIONS] Broker error:', brokerData.error || 'none');
    console.log('🔔 [NOTIFICATIONS] Issuer data:', issuerData.data ? `✅ ${issuerData.data.issuer_name}` : '❌ NULL');
    console.log('🔔 [NOTIFICATIONS] Issuer error:', issuerData.error || 'none');

    // Send notifications asynchronously (don't block response)
    if (brokerData.data && issuerData.data) {
      console.log('🔔 [NOTIFICATIONS] ✅ Both broker and issuer data available, proceeding...');

      // Import notification service dynamically to avoid circular dependencies
      import('@/lib/services/notification-service').then(({ notifyBrokerRequestSubmitted }) => {
        console.log('🔔 [NOTIFICATIONS] ✅ Notification service imported successfully');
        console.log('🔔 [NOTIFICATIONS] Calling notifyBrokerRequestSubmitted with:', {
          requestId: newRequest.id,
          requestNumber: newRequest.request_number,
          brokerEmail: brokerData.data.email,
          issuerName: issuerData.data.issuer_name
        });

        notifyBrokerRequestSubmitted(newRequest, brokerData.data, issuerData.data, request)
          .then(result => {
            console.log('🔔 [NOTIFICATIONS] ✅ SUCCESS! Result:', result);
          })
          .catch(err => {
            console.error('🔔 [NOTIFICATIONS] ❌ ERROR:', err);
            console.error('🔔 [NOTIFICATIONS] Error stack:', err.stack);
          });
      }).catch(importErr => {
        console.error('🔔 [NOTIFICATIONS] ❌ Failed to import notification service:', importErr);
        console.error('🔔 [NOTIFICATIONS] Import error stack:', importErr.stack);
      });
    } else {
      console.error('🔔 [NOTIFICATIONS] ❌ SKIPPED - Missing data:', {
        hasBrokerData: !!brokerData.data,
        hasIssuerData: !!issuerData.data
      });
    }

    return NextResponse.json(newRequest, { status: 201 });
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH - Update transfer request (status, assignment, etc.)
export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();
    const body = await request.json();

    const { requestId, updates } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    // Fetch the request to check permissions
    const { data: existingRequest, error: fetchError } = await supabase
      .from("transfer_agent_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError) throw fetchError;

    // Check if issuer is suspended or pending (transactions blocked for both)
    if (existingRequest.issuer_id) {
      const transactionAccess = await checkIssuerTransactionAccess(supabase, existingRequest.issuer_id);
      if (!transactionAccess.allowed) {
        return NextResponse.json(
          { error: transactionAccess.reason || 'Cannot modify transfer requests for this issuer' },
          { status: 403 }
        );
      }
    }

    // Permission checks
    if (userRole === "broker") {
      if (existingRequest.broker_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existingRequest.status !== "Pending") {
        return NextResponse.json({ error: "Cannot update request after submission" }, { status: 403 });
      }
    }

    // Prepare update object with timestamps
    const updateData = { ...updates };

    if (updates.status) {
      if (updates.status === "Under Review" && !existingRequest.review_started_at) {
        updateData.review_started_at = new Date().toISOString();
      }
      if (updates.status === "Approved" && !existingRequest.approved_at) {
        updateData.approved_at = new Date().toISOString();
      }
      if (updates.status === "Completed" && !existingRequest.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      if (updates.status === "Rejected" && !existingRequest.rejected_at) {
        updateData.rejected_at = new Date().toISOString();
      }
    }

    if (updates.assigned_to) {
      updateData.assigned_at = new Date().toISOString();
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("transfer_agent_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 🔔 NOTIFY BROKER OF STATUS CHANGE
    if (updates.status && updatedRequest.broker_id) {
      console.log('🔔 [STATUS-CHANGE] Notifying broker of status change...');

      // Fetch broker and admin data
      const [brokerData, adminData] = await Promise.all([
        supabase.from('users_new').select('id, name, email').eq('id', updatedRequest.broker_id).single(),
        supabase.from('users_new').select('id, name, email').eq('id', user.id).single()
      ]);

      if (brokerData.data && adminData.data) {
        // Import and call notification service
        import('@/lib/services/broker-notification-service').then(({ notifyBrokerOfStatusChange }) => {
          notifyBrokerOfStatusChange(
            updatedRequest,
            updates.status,
            adminData.data,
            brokerData.data,
            request
          ).then(result => {
            console.log('🔔 [STATUS-CHANGE] Broker notified:', result);
          }).catch(err => {
            console.error('🔔 [STATUS-CHANGE] Notification error:', err);
          });
        });
      }
    }

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (err) {
    console.error("PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
