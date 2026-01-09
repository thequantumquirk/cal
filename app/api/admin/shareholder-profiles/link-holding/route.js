import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch shareholders for an issuer (all shareholders, can filter by unlinked only)
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const issuerId = searchParams.get("issuer_id");
    const search = searchParams.get("search");
    const unlinkedOnly = searchParams.get("unlinked_only") === "true";
    const excludeUserId = searchParams.get("exclude_user_id"); // Exclude shareholders already linked to this user

    let query = supabase
      .from("shareholders_new")
      .select(`
        id,
        account_number,
        first_name,
        last_name,
        email,
        issuer_id,
        user_id,
        issuers_new:issuer_id (
          id,
          issuer_name
        )
      `);

    // Only filter by unlinked if explicitly requested
    if (unlinkedOnly) {
      query = query.is("user_id", null);
    }

    // Exclude shareholders already linked to this user
    if (excludeUserId) {
      query = query.or(`user_id.is.null,user_id.neq.${excludeUserId}`);
    }

    if (issuerId) {
      query = query.eq("issuer_id", issuerId);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,account_number.ilike.%${search}%,email.ilike.%${search}%`);
    }

    query = query.order("last_name").limit(100);

    const { data: shareholders, error } = await query;

    if (error) {
      console.error("Error fetching shareholders:", error);
      throw error;
    }

    return NextResponse.json(shareholders || []);
  } catch (err) {
    console.error("GET Shareholders Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Link a shareholder record to a user or email
// Supports two modes:
// 1. Link to user_id (for existing users) - sets user_id and email
// 2. Link to email only (for future users) - sets email only
export async function POST(request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden - Superadmin access only" }, { status: 403 });
    }

    const body = await request.json();
    const { shareholder_id, shareholder_ids, user_id, email } = body;

    // Support both single and batch linking
    const idsToLink = shareholder_ids || (shareholder_id ? [shareholder_id] : []);

    if (idsToLink.length === 0) {
      return NextResponse.json({ error: "shareholder_id or shareholder_ids is required" }, { status: 400 });
    }

    if (!user_id && !email) {
      return NextResponse.json({ error: "Either user_id or email is required" }, { status: 400 });
    }

    const client = adminClient || supabase;

    // If user_id provided, verify the user exists
    let targetUser = null;
    if (user_id) {
      const { data: userData, error: userError } = await client
        .from("users_new")
        .select("id, email")
        .eq("id", user_id)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      targetUser = userData;
    }

    const results = [];
    const errors = [];

    for (const shId of idsToLink) {
      // Verify the shareholder exists
      const { data: shareholder, error: shError } = await client
        .from("shareholders_new")
        .select("id, user_id, email, first_name, last_name, issuer_id")
        .eq("id", shId)
        .single();

      if (shError || !shareholder) {
        errors.push({ id: shId, error: "Shareholder not found" });
        continue;
      }

      // Skip if already linked to the same user
      if (user_id && shareholder.user_id === user_id) {
        errors.push({ id: shId, error: "Already linked to this user" });
        continue;
      }

      // Prepare update data
      const updateData = {};

      if (user_id) {
        updateData.user_id = user_id;
        updateData.email = targetUser.email;
      } else if (email) {
        updateData.email = email;
        // Don't set user_id - will be set when user signs up
      }

      const { error: updateError } = await client
        .from("shareholders_new")
        .update(updateData)
        .eq("id", shId);

      if (updateError) {
        console.error("Error linking shareholder:", updateError);
        errors.push({ id: shId, error: "Failed to update" });
        continue;
      }

      // If linking to user_id, also create issuer_users_new record
      if (user_id) {
        const { data: shareholderRole } = await client
          .from("roles_new")
          .select("id")
          .eq("role_name", "Shareholder")
          .single();

        if (shareholderRole) {
          const { data: existingIssuerUser } = await client
            .from("issuer_users_new")
            .select("id")
            .eq("user_id", user_id)
            .eq("issuer_id", shareholder.issuer_id)
            .maybeSingle();

          if (!existingIssuerUser) {
            await client
              .from("issuer_users_new")
              .insert({
                user_id: user_id,
                issuer_id: shareholder.issuer_id,
                role_id: shareholderRole.id,
                is_primary: false
              });
          }
        }
      }

      results.push({
        id: shId,
        first_name: shareholder.first_name,
        last_name: shareholder.last_name,
        issuer_id: shareholder.issuer_id
      });
    }

    return NextResponse.json({
      success: true,
      message: `Linked ${results.length} shareholder(s) successfully`,
      linked: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("POST Link Shareholder Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
