import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch broker request stats (superadmin only)
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden - Superadmin access only" }, { status: 403 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Fetch request stats for this broker
    const { data: requests, error: requestsError } = await supabase
      .from("transfer_agent_requests")
      .select("id, status")
      .eq("broker_id", userId);

    if (requestsError) {
      throw requestsError;
    }

    const requestsList = requests || [];

    const stats = {
      total: requestsList.length,
      pending: requestsList.filter(r => r.status === "Pending" || r.status === "Under Review").length,
      completed: requestsList.filter(r => r.status === "Completed").length,
      rejected: requestsList.filter(r => r.status === "Rejected").length,
      processing: requestsList.filter(r => r.status === "Processing" || r.status === "Approved").length
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET Broker Stats Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
