import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend-client";
import { render } from "@react-email/render";
import EmailOTPTemplate from "@/lib/email/templates/email-otp-template";
import { getCurrentUserRole } from "@/lib/actions";

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Determine which profile table to use based on user role
 */
function getProfileTable(userRole) {
  if (userRole === "broker") {
    return "broker_profiles";
  } else if (userRole === "shareholder") {
    return "shareholder_profiles";
  }
  // Default to broker_profiles for backwards compatibility
  return "broker_profiles";
}

/**
 * POST - Send OTP to user's email
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "No email found for user" }, { status: 400 });
    }

    // Determine the profile table based on user role
    const userRole = await getCurrentUserRole();
    const profileTable = getProfileTable(userRole);

    // Generate OTP and expiry (5 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const client = adminClient || supabase;

    // Check if profile exists
    const { data: existingProfile } = await client
      .from(profileTable)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingProfile) {
      // Update existing profile with OTP
      await client
        .from(profileTable)
        .update({
          email_otp_code: otp,
          email_otp_expires_at: expiresAt
        })
        .eq("user_id", user.id);
    } else {
      // Create profile with OTP
      await client
        .from(profileTable)
        .insert({
          user_id: user.id,
          email_otp_code: otp,
          email_otp_expires_at: expiresAt
        });
    }

    // Send OTP email
    const emailHtml = await render(
      EmailOTPTemplate({
        userName: user.email.split("@")[0],
        otpCode: otp,
        expiryMinutes: 5
      })
    );

    const emailResult = await sendEmail({
      to: user.email,
      subject: "Your Efficiency verification code",
      html: emailHtml
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email"
    });

  } catch (err) {
    console.error("Send OTP error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT - Verify OTP code
 */
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    // Determine the profile table based on user role
    const userRole = await getCurrentUserRole();
    const profileTable = getProfileTable(userRole);

    // Get stored OTP from profile table
    const client = adminClient || supabase;
    const { data: profile, error: profileError } = await client
      .from(profileTable)
      .select("email_otp_code, email_otp_expires_at")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
    }

    // Check if OTP has expired
    if (new Date(profile.email_otp_expires_at) < new Date()) {
      // Clear expired OTP
      await client
        .from(profileTable)
        .update({
          email_otp_code: null,
          email_otp_expires_at: null
        })
        .eq("user_id", user.id);

      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Verify OTP
    if (profile.email_otp_code !== code) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // OTP verified - clear it and mark 2FA as verified
    await client
      .from(profileTable)
      .update({
        email_otp_code: null,
        email_otp_expires_at: null,
        email_otp_verified: true,
        email_otp_verified_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
