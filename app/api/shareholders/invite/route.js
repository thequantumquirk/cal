import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";
import { sendEmail } from "@/lib/email/resend-client";
import { render } from "@react-email/render";
import ShareholderInvitationEmail from "@/lib/email/templates/shareholder-invitation-email";

// POST - Invite a shareholder (admin, superadmin, or transfer_team)
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    // Permission check: admin, superadmin, or transfer_team can invite
    if (!["admin", "superadmin", "transfer_team"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const { email, name, shareholder_id, issuer_id, holdings } = await request.json();

    let shareholderEmail = email;
    let shareholderName = name;
    let issuerName = null;
    let effectiveIssuerId = issuer_id;

    // Case 1: Inviting an existing shareholder by ID
    if (shareholder_id) {
      const { data: shareholder, error: shError } = await supabase
        .from("shareholders_new")
        .select("id, email, first_name, last_name, issuer_id, issuers_new:issuer_id (id, issuer_name)")
        .eq("id", shareholder_id)
        .single();

      if (shError || !shareholder) {
        return NextResponse.json({ error: "Shareholder not found" }, { status: 404 });
      }

      if (!shareholder.email) {
        return NextResponse.json({ error: "Shareholder does not have an email address" }, { status: 400 });
      }

      if (shareholder.user_id) {
        return NextResponse.json({ error: "Shareholder already has an account linked" }, { status: 400 });
      }

      shareholderEmail = shareholder.email;
      shareholderName = [shareholder.first_name, shareholder.last_name].filter(Boolean).join(" ") || shareholder.email.split("@")[0];
      effectiveIssuerId = shareholder.issuer_id;
      issuerName = shareholder.issuers_new?.issuer_name;
    }

    // Validate email is provided
    if (!shareholderEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = shareholderEmail.toLowerCase();

    // Check if user already exists in users_new
    const { data: existingUser } = await supabase
      .from("users_new")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    // Check if already invited
    const { data: existingInvite } = await supabase
      .from("invited_users_new")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 400 });
    }

    // Get shareholder role ID
    const { data: shareholderRole, error: roleError } = await supabase
      .from("roles_new")
      .select("id")
      .eq("role_name", "Shareholder")
      .single();

    if (roleError || !shareholderRole) {
      console.error("Failed to find Shareholder role:", roleError);
      return NextResponse.json({ error: "Shareholder role not found in system" }, { status: 500 });
    }

    // Fetch issuer name if issuer_id provided but no issuerName yet
    if (effectiveIssuerId && !issuerName) {
      const { data: issuer } = await supabase
        .from("issuers_new")
        .select("issuer_name")
        .eq("id", effectiveIssuerId)
        .single();
      issuerName = issuer?.issuer_name;
    }

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from("invited_users_new")
      .insert({
        email: normalizedEmail,
        name: shareholderName || normalizedEmail.split("@")[0],
        role_id: shareholderRole.id,
        issuer_id: effectiveIssuerId || null
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create invitation:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send invitation email
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://app.useefficiency.com';
    const inviteToken = invitation.id;
    const inviteUrl = `${origin}/shareholder/invite/${inviteToken}`;

    try {
      const emailHtml = await render(
        ShareholderInvitationEmail({
          shareholderName: shareholderName || normalizedEmail.split("@")[0],
          inviteUrl,
          issuerName,
        })
      );

      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: issuerName
          ? `Set up your shareholder account for ${issuerName}`
          : "Set up your shareholder account at Efficiency",
        html: emailHtml,
      });

      if (!emailResult.success) {
        console.error("Failed to send invitation email:", emailResult.error);
        // Don't fail the invitation if email fails, just log it
      } else {
        console.log("Shareholder invitation email sent successfully to:", normalizedEmail);
      }
    } catch (emailError) {
      console.error("Email rendering/sending error:", emailError);
      // Continue - invitation was created, email failed
    }

    // Link holdings to the invited email if provided
    let linkedHoldings = [];
    if (holdings && Array.isArray(holdings) && holdings.length > 0) {
      for (const holdingId of holdings) {
        const { data: linked, error: linkError } = await supabase
          .from("shareholders_new")
          .update({ email: normalizedEmail })
          .eq("id", holdingId)
          .select("id, first_name, last_name, issuer_id")
          .single();

        if (!linkError && linked) {
          linkedHoldings.push(linked);
        } else {
          console.warn(`Failed to link holding ${holdingId}:`, linkError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${normalizedEmail}`,
      invitation,
      linkedHoldings: linkedHoldings.length > 0 ? linkedHoldings : undefined
    });
  } catch (err) {
    console.error("POST Shareholder Invite Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
