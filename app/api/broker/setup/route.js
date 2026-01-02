import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST - Set up a new broker user from their invitation
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
      // Check if role also exists
      const { data: roleAssignment } = await supabase
        .from("issuer_users_new")
        .select("id")
        .eq("user_id", user.id)
        .is("issuer_id", null)
        .maybeSingle();

      if (roleAssignment) {
        return NextResponse.json({ success: true, message: "User and role already set up" });
      }
      // If role missing, continue to create it
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
      // LAST RESORT: If user exists in users_new but missing role and invitation is gone
      // check if we can find a broker role and assign it
      if (existingUser) {
        const { data: brokerRole } = await client
          .from("roles_new")
          .select("id")
          .eq("role_name", "broker")
          .single();

        if (brokerRole) {
          await client.from("issuer_users_new").insert({
            user_id: user.id,
            issuer_id: null,
            role_id: brokerRole.id,
            is_primary: true
          });
          return NextResponse.json({ success: true, message: "Assigned broker role via fallback" });
        }
      }
      return NextResponse.json({ error: "No invitation found for this email" }, { status: 403 });
    }

    // Verify it's a broker invitation
    if (invitation.roles_new?.role_name !== "broker") {
      return NextResponse.json({ error: "Invalid invitation type" }, { status: 403 });
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

    // Create issuer_users_new entry for broker role
    const { error: roleError } = await client
      .from("issuer_users_new")
      .insert({
        user_id: user.id,
        issuer_id: invitation.issuer_id, // Will be null for brokers (they have access to all issuers)
        role_id: invitation.role_id,
        is_primary: true
      });

    if (roleError) {
      console.error("Error creating role assignment:", roleError);
      // Don't fail completely - user was created
    }

    console.log("Broker user set up successfully:", user.email);

    return NextResponse.json({
      success: true,
      message: "User set up successfully"
    });

  } catch (err) {
    console.error("Broker setup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
