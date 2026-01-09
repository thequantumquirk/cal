import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// POST - Unlink a shareholder record from a user
// Sets user_id = null on the shareholder record
// Does NOT delete the shareholder record
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
    const { shareholder_id } = body;

    if (!shareholder_id) {
      return NextResponse.json({ error: "shareholder_id is required" }, { status: 400 });
    }

    const client = adminClient || supabase;

    // Verify the shareholder exists and get current user_id
    const { data: shareholder, error: shError } = await client
      .from("shareholders_new")
      .select("id, user_id, first_name, last_name, issuer_id")
      .eq("id", shareholder_id)
      .single();

    if (shError || !shareholder) {
      return NextResponse.json({ error: "Shareholder not found" }, { status: 404 });
    }

    if (!shareholder.user_id) {
      return NextResponse.json({ error: "Shareholder is not linked to any user" }, { status: 400 });
    }

    const previousUserId = shareholder.user_id;

    // Unlink the shareholder by setting user_id to null
    const { error: updateError } = await client
      .from("shareholders_new")
      .update({ user_id: null })
      .eq("id", shareholder_id);

    if (updateError) {
      console.error("Error unlinking shareholder:", updateError);
      return NextResponse.json({ error: "Failed to unlink shareholder" }, { status: 500 });
    }

    // Check if the user still has any other shareholders linked for this issuer
    // If not, remove the issuer_users_new record
    const { data: remainingShareholders } = await client
      .from("shareholders_new")
      .select("id")
      .eq("user_id", previousUserId)
      .eq("issuer_id", shareholder.issuer_id);

    if (!remainingShareholders || remainingShareholders.length === 0) {
      // No more shareholders for this issuer, remove issuer_users_new record
      await client
        .from("issuer_users_new")
        .delete()
        .eq("user_id", previousUserId)
        .eq("issuer_id", shareholder.issuer_id);
    }

    return NextResponse.json({
      success: true,
      message: `Unlinked ${shareholder.first_name} ${shareholder.last_name} from user`,
      shareholder: {
        id: shareholder.id,
        first_name: shareholder.first_name,
        last_name: shareholder.last_name,
        issuer_id: shareholder.issuer_id
      }
    });
  } catch (err) {
    console.error("POST Unlink Shareholder Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
