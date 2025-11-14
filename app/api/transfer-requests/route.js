import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

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
      dtcNumber,
      securityType,
      quantity,
      cusip,
      requestedCompletionDate,
      specialInstructions,
      priority
    } = body;

    // Validation
    if (!issuerId || !requestType || !shareholderName || !accountNumber || !securityType || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
        dtc_number: dtcNumber,
        security_type: securityType,
        quantity: quantity,
        cusip: cusip,
        requested_completion_date: requestedCompletionDate,
        special_instructions: specialInstructions,
        priority: priority || "Normal",
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

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (err) {
    console.error("PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
