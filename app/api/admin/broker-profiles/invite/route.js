import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";
import { sendEmail } from "@/lib/email/resend-client";
import { render } from "@react-email/render";
import BrokerInvitationEmail from "@/lib/email/templates/broker-invitation-email";

// POST - Invite a new broker (superadmin only)
export async function POST(request) {
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

    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users_new")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Check if already invited
    const { data: existingInvite } = await supabase
      .from("invited_users_new")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 400 });
    }

    // Get broker role ID
    const { data: brokerRole, error: roleError } = await supabase
      .from("roles_new")
      .select("id")
      .eq("role_name", "broker")
      .single();

    if (roleError || !brokerRole) {
      console.error("Failed to find broker role:", roleError);
      return NextResponse.json({ error: "Broker role not found in system" }, { status: 500 });
    }

    // Create invitation without issuer_id (brokers have access to all active issuers)
    const { data: invitation, error: insertError } = await supabase
      .from("invited_users_new")
      .insert({
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        role_id: brokerRole.id,
        issuer_id: null // Brokers don't belong to a specific issuer
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create invitation:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send invitation email - use request origin for dynamic URL with token
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://app.useefficiency.com';
    const inviteToken = invitation.id;
    const inviteUrl = `${origin}/broker/invite/${inviteToken}`;
    const brokerName = name || email.split("@")[0];

    try {
      const emailHtml = await render(
        BrokerInvitationEmail({
          brokerName,
          inviteUrl,
        })
      );

      const emailResult = await sendEmail({
        to: email.toLowerCase(),
        subject: "Set up your account at Efficiency",
        html: emailHtml,
      });

      if (!emailResult.success) {
        console.error("Failed to send invitation email:", emailResult.error);
        // Don't fail the invitation if email fails, just log it
      } else {
        console.log("Invitation email sent successfully to:", email);
      }
    } catch (emailError) {
      console.error("Email rendering/sending error:", emailError);
      // Continue - invitation was created, email failed
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation
    });
  } catch (err) {
    console.error("POST Broker Invite Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
