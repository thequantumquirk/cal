import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch all shareholders with user accounts (superadmin only)
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

    // Get shareholder role ID
    const { data: shareholderRole } = await supabase
      .from("roles_new")
      .select("id")
      .eq("role_name", "Shareholder")
      .single();

    if (!shareholderRole) {
      return NextResponse.json([]);
    }

    // Fetch shareholders that have user_id set (linked to a user account)
    const { data: linkedShareholders, error: shareholdersError } = await supabase
      .from("shareholders_new")
      .select(`
        id,
        user_id,
        issuer_id,
        email,
        first_name,
        last_name,
        account_number,
        created_at,
        issuers_new:issuer_id (
          id,
          issuer_name
        )
      `)
      .not("user_id", "is", null);

    if (shareholdersError) {
      console.error("Error fetching linked shareholders:", shareholdersError);
      throw shareholdersError;
    }

    // Get unique user IDs
    const userIds = [...new Set(linkedShareholders?.map(s => s.user_id).filter(Boolean) || [])];

    if (userIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch users separately (since FK relationship might not be set up)
    const { data: users, error: usersError } = await supabase
      .from("users_new")
      .select("id, email, name, created_at")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Fetch shareholder profiles for these users (may not exist for all)
    const { data: profiles } = await supabase
      .from("shareholder_profiles")
      .select("*")
      .in("user_id", userIds);

    // Don't throw - just use empty map if table missing or error
    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Group by user and combine with profile data
    const resultMap = new Map();

    linkedShareholders?.forEach(sh => {
      const userId = sh.user_id;
      const userData = usersMap.get(userId);
      if (!userData) return;

      if (!resultMap.has(userId)) {
        const profile = profilesMap.get(userId);
        resultMap.set(userId, {
          id: userId,
          user_id: userId,
          user: userData,
          onboarding_completed: profile?.onboarding_completed || false,
          onboarding_completed_at: profile?.onboarding_completed_at || null,
          created_at: userData.created_at,
          holdings: []
        });
      }

      // Add holding to the user's list
      if (sh.issuers_new) {
        resultMap.get(userId).holdings.push({
          shareholder_id: sh.id,
          issuer_id: sh.issuer_id,
          issuer_name: sh.issuers_new.issuer_name,
          account_number: sh.account_number,
          first_name: sh.first_name,
          last_name: sh.last_name
        });
      }
    });

    const shareholders = Array.from(resultMap.values());

    // Sort by created_at descending
    shareholders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json(shareholders);
  } catch (err) {
    console.error("GET Shareholder Profiles Error:", err);
    return NextResponse.json({
      error: err.message,
      details: err.details || null,
      hint: err.hint || null
    }, { status: 500 });
  }
}
