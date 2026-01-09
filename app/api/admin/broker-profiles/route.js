import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch all brokers with their profiles (superadmin only)
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

    // First, get the broker role ID
    const { data: brokerRole } = await supabase
      .from("roles_new")
      .select("id")
      .eq("role_name", "broker")
      .single();

    if (!brokerRole) {
      return NextResponse.json([]);
    }

    // Fetch all users with broker role from issuer_users_new
    const { data: brokerUsers, error: brokerUsersError } = await supabase
      .from("issuer_users_new")
      .select(`
        user_id,
        issuer_id,
        created_at,
        users_new:user_id (
          id,
          email,
          name,
          created_at
        ),
        issuers_new:issuer_id (
          id,
          issuer_name
        )
      `)
      .eq("role_id", brokerRole.id);

    if (brokerUsersError) {
      console.error("Error fetching broker users:", brokerUsersError);
      throw brokerUsersError;
    }

    // Get unique user IDs
    const userIds = [...new Set(brokerUsers?.map(b => b.user_id).filter(Boolean) || [])];

    if (userIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch broker profiles for these users (may not exist for all)
    const { data: profiles } = await supabase
      .from("broker_profiles")
      .select("*")
      .in("user_id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Group by user and combine with profile data
    const usersMap = new Map();

    brokerUsers?.forEach(bu => {
      if (!bu.users_new) return;

      const userId = bu.user_id;
      if (!usersMap.has(userId)) {
        const profile = profilesMap.get(userId);
        usersMap.set(userId, {
          id: profile?.id || `user-${userId}`,
          user_id: userId,
          user: bu.users_new,
          company_name: profile?.company_name || null,
          company_type: profile?.company_type || null,
          dtc_participant_number: profile?.dtc_participant_number || null,
          primary_contact_name: profile?.primary_contact_name || null,
          primary_contact_phone: profile?.primary_contact_phone || null,
          address_line1: profile?.address_line1 || null,
          city: profile?.city || null,
          state: profile?.state || null,
          zip_code: profile?.zip_code || null,
          onboarding_completed: profile?.onboarding_completed || false,
          onboarding_completed_at: profile?.onboarding_completed_at || null,
          created_at: profile?.created_at || bu.users_new.created_at,
          issuers: []
        });
      }

      // Add issuer to the broker's list
      if (bu.issuers_new) {
        usersMap.get(userId).issuers.push(bu.issuers_new);
      }
    });

    const brokers = Array.from(usersMap.values());

    // Sort by created_at descending
    brokers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json(brokers);
  } catch (err) {
    console.error("GET Broker Profiles Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
