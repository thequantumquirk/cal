
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all issuers with user counts
    const { data: issuers, error: fetchError } = await supabase
      .from("issuers_new")
      .select(`
        *,
        issuer_users_new (
          id,
          user_id
        )
      `)
      .order("display_name");

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Calculate user counts
    const issuersWithCounts = issuers?.map(issuer => ({
      ...issuer,
      user_count: issuer.issuer_users_new?.length || 0,
      primary_users: 0
    })) || [];

    return NextResponse.json(issuersWithCounts, { status: 200 });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
