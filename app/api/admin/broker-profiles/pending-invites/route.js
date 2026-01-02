import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch pending broker invitations (superadmin only)
export async function GET() {
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

    // Get broker role ID
    const { data: brokerRole } = await supabase
      .from("roles_new")
      .select("id")
      .eq("role_name", "broker")
      .single();

    if (!brokerRole) {
      return NextResponse.json([]);
    }

    // Fetch pending invitations for brokers (those with broker role_id)
    const { data: invitations, error: invitationsError } = await supabase
      .from("invited_users_new")
      .select("*")
      .eq("role_id", brokerRole.id)
      .order("invited_at", { ascending: false });

    if (invitationsError) {
      console.error("Error fetching invitations:", invitationsError);
      throw invitationsError;
    }

    return NextResponse.json(invitations || []);
  } catch (err) {
    console.error("GET Pending Invites Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
