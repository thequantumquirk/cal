import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST - Set up a new shareholder user from their invitation
 * This is called after email/password signup to create the user record
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already exists in users_new
    const { data: existingUser } = await supabase
      .from("users_new")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      // User already set up, just ensure shareholders are linked
      await linkShareholdersByEmail(supabase, user.id, user.email);
      return NextResponse.json({ success: true, message: "User already set up" });
    }

    // Check for invitation
    const client = adminClient || supabase;
    const { data: invitation, error: inviteError } = await client
      .from("invited_users_new")
      .select(`
        email,
        name,
        role_id,
        issuer_id,
        roles_new:role_id (id, role_name)
      `)
      .eq("email", user.email)
      .maybeSingle();

    if (inviteError) {
      console.error("Error checking invitation:", inviteError);
      return NextResponse.json({ error: "Failed to check invitation" }, { status: 500 });
    }

    if (!invitation) {
      return NextResponse.json({ error: "No invitation found for this email" }, { status: 403 });
    }

    // Verify it's a shareholder invitation
    if (invitation.roles_new?.role_name !== "Shareholder") {
      return NextResponse.json({ error: "Invalid invitation type - expected Shareholder" }, { status: 403 });
    }

    // Create user in users_new
    const { error: createUserError } = await client
      .from("users_new")
      .insert({
        id: user.id,
        email: user.email,
        name: invitation.name || user.email.split("@")[0],
        is_super_admin: false,
        is_owner: false
      });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return NextResponse.json({ error: "Failed to create user record" }, { status: 500 });
    }

    // Link all shareholders_new records that match this email
    await linkShareholdersByEmail(client, user.id, user.email);

    console.log("Shareholder user set up successfully:", user.email);

    return NextResponse.json({
      success: true,
      message: "User set up successfully"
    });

  } catch (err) {
    console.error("Shareholder setup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Link all shareholder records that match the user's email
 */
async function linkShareholdersByEmail(client, userId, email) {
  try {
    const { data: linkedRecords, error } = await client
      .from("shareholders_new")
      .update({ user_id: userId })
      .eq("email", email.toLowerCase())
      .is("user_id", null)
      .select("id");

    if (error) {
      console.error("Error linking shareholders:", error);
    } else if (linkedRecords?.length > 0) {
      console.log(`Linked ${linkedRecords.length} shareholder record(s) to user ${email}`);
    }
  } catch (err) {
    console.error("Error in linkShareholdersByEmail:", err);
  }
}
