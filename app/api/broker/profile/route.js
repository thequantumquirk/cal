import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch current broker's profile (mainly for onboarding status)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "broker") {
      return NextResponse.json({ error: "Forbidden - Broker access only" }, { status: 403 });
    }

    // Fetch broker profile
    const { data: profile, error: profileError } = await supabase
      .from("broker_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = no rows found (acceptable - new broker)
      console.error("Profile fetch error:", profileError);
      throw profileError;
    }

    // If no profile exists, return empty profile with onboarding_completed = false
    if (!profile) {
      return NextResponse.json({
        user_id: user.id,
        onboarding_completed: false
      });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("GET Profile Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update broker profile / Complete onboarding
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "broker") {
      return NextResponse.json({ error: "Forbidden - Broker access only" }, { status: 403 });
    }

    const body = await request.json();
    const {
      completeOnboarding,
      first_name,
      last_name,
      company_name,
      company_address,
      phone_number,
      dtcc_participant_number
    } = body;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("broker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const profileData = {
      user_id: user.id
    };

    // Add profile fields if provided
    if (first_name !== undefined) profileData.first_name = first_name;
    if (last_name !== undefined) profileData.last_name = last_name;
    if (company_name !== undefined) profileData.company_name = company_name;
    if (company_address !== undefined) profileData.company_address = company_address;
    if (phone_number !== undefined) profileData.phone_number = phone_number;
    if (dtcc_participant_number !== undefined) profileData.dtcc_participant_number = dtcc_participant_number;

    // If completing onboarding, set the flag
    if (completeOnboarding) {
      profileData.onboarding_completed = true;
      profileData.onboarding_completed_at = new Date().toISOString();
    }

    // Sync name to users_new if first_name or last_name provided
    if (first_name || last_name) {
      const fullName = [first_name, last_name].filter(Boolean).join(" ").trim();
      if (fullName) {
        await supabase
          .from("users_new")
          .update({ name: fullName })
          .eq("id", user.id);
      }
    }

    let result;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("broker_profiles")
        .update(profileData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from("broker_profiles")
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("PUT Profile Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
