import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch current shareholder's profile (for onboarding status)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "shareholder") {
      return NextResponse.json({ error: "Forbidden - Shareholder access only" }, { status: 403 });
    }

    // Fetch shareholder profile
    const { data: profile, error: profileError } = await supabase
      .from("shareholder_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = no rows found (acceptable - new shareholder)
      console.error("Profile fetch error:", profileError);
      throw profileError;
    }

    // If profile exists, return it
    if (profile) {
      return NextResponse.json(profile);
    }

    // No profile exists yet - try to pre-fill from existing shareholder records
    const { data: shareholderRecords } = await supabase
      .from("shareholders_new")
      .select("first_name, last_name, phone, address, city, state, zip, country")
      .eq("email", user.email.toLowerCase())
      .limit(1);

    const prefillData = shareholderRecords?.[0] || {};

    return NextResponse.json({
      user_id: user.id,
      onboarding_completed: false,
      first_name: prefillData.first_name || "",
      last_name: prefillData.last_name || "",
      phone_number: prefillData.phone || "",
      address: prefillData.address || "",
      city: prefillData.city || "",
      state: prefillData.state || "",
      zip_code: prefillData.zip || "",
      country: prefillData.country || "USA",
    });
  } catch (err) {
    console.error("GET Shareholder Profile Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update shareholder profile / Complete onboarding
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "shareholder") {
      return NextResponse.json({ error: "Forbidden - Shareholder access only" }, { status: 403 });
    }

    const body = await request.json();
    const {
      completeOnboarding,
      first_name,
      last_name,
      phone_number,
      address,
      city,
      state,
      zip_code,
      country
    } = body;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("shareholder_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const profileData = {
      user_id: user.id
    };

    // Add profile fields if provided
    if (first_name !== undefined) profileData.first_name = first_name;
    if (last_name !== undefined) profileData.last_name = last_name;
    if (phone_number !== undefined) profileData.phone_number = phone_number;
    if (address !== undefined) profileData.address = address;
    if (city !== undefined) profileData.city = city;
    if (state !== undefined) profileData.state = state;
    if (zip_code !== undefined) profileData.zip_code = zip_code;
    if (country !== undefined) profileData.country = country;

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

    // Sync profile fields to ALL shareholders_new records with matching email
    // This ensures that when a shareholder edits their profile during onboarding,
    // all their linked holdings get updated with the correct name/address info
    const shareholderUpdateData = {};
    if (first_name !== undefined) shareholderUpdateData.first_name = first_name;
    if (last_name !== undefined) shareholderUpdateData.last_name = last_name;
    if (phone_number !== undefined) shareholderUpdateData.phone = phone_number;
    if (address !== undefined) shareholderUpdateData.address = address;
    if (city !== undefined) shareholderUpdateData.city = city;
    if (state !== undefined) shareholderUpdateData.state = state;
    if (zip_code !== undefined) shareholderUpdateData.zip = zip_code;
    if (country !== undefined) shareholderUpdateData.country = country;

    // Only update if there are fields to update
    if (Object.keys(shareholderUpdateData).length > 0) {
      const { error: shareholderUpdateError } = await supabase
        .from("shareholders_new")
        .update(shareholderUpdateData)
        .eq("email", user.email.toLowerCase());

      if (shareholderUpdateError) {
        console.warn("Failed to sync profile to shareholders_new:", shareholderUpdateError);
        // Don't fail the request - just log the error
      }
    }

    let result;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("shareholder_profiles")
        .update(profileData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from("shareholder_profiles")
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("PUT Shareholder Profile Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
