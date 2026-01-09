import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch communications for a request
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    const userRole = await getCurrentUserRole();

    let query = supabase
      .from("transfer_request_communications")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    // Brokers can't see internal messages
    if (userRole === "broker") {
      query = query.eq("is_internal", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch user data for each communication
    const enrichedData = await Promise.all(
      (data || []).map(async (comm) => {
        const userData = comm.user_id
          ? await supabase.from("users_new").select("id, name, email").eq("id", comm.user_id).single()
          : { data: null };

        return {
          ...comm,
          user: userData.data
        };
      })
    );

    return NextResponse.json(enrichedData, { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Add communication/comment
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { requestId, message, isInternal } = body;

    if (!requestId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to this request
    const { data: transferRequest, error: fetchError } = await supabase
      .from("transfer_agent_requests")
      .select("broker_id")
      .eq("id", requestId)
      .single();

    if (fetchError) throw fetchError;

    const userRole = await getCurrentUserRole();

    if (userRole === "broker" && transferRequest.broker_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Brokers can't create internal messages
    const internal = userRole === "broker" ? false : (isInternal || false);

    // Insert communication
    const { data: newComm, error: insertError } = await supabase
      .from("transfer_request_communications")
      .insert({
        request_id: requestId,
        user_id: user.id,
        message: message,
        is_internal: internal
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch user data
    const userData = await supabase
      .from("users_new")
      .select("id, name, email")
      .eq("id", user.id)
      .single();

    // 🔔 NOTIFY BROKER OF ADMIN COMMENT
    if (userRole !== 'broker' && transferRequest.broker_id && !internal) {
      console.log('🔔 [COMMENT] Notifying broker of admin comment...');

      // Fetch broker data and full request data
      const [brokerData, fullRequest] = await Promise.all([
        supabase.from('users_new').select('id, name, email').eq('id', transferRequest.broker_id).single(),
        supabase.from('transfer_agent_requests').select('*').eq('id', requestId).single()
      ]);

      if (brokerData.data && fullRequest.data) {
        // Import and call notification service
        import('@/lib/services/broker-notification-service').then(({ notifyBrokerOfComment }) => {
          notifyBrokerOfComment(
            fullRequest.data,
            newComm,
            userData.data,
            brokerData.data,
            request
          ).then(result => {
            console.log('🔔 [COMMENT] Broker notified:', result);
          }).catch(err => {
            console.error('🔔 [COMMENT] Notification error:', err);
          });
        });
      }
    }

    return NextResponse.json({
      ...newComm,
      user: userData.data
    }, { status: 201 });
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
