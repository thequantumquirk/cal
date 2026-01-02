import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkIssuerWriteAccess } from "@/lib/issuer-utils";

// POST -> bulk insert shareholder positions
export async function POST(req) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isArray = Array.isArray(body);
    const items = isArray ? body : [body];

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No positions provided" }, { status: 400 });
    }

    // Check if issuer is suspended (get issuer_id from first item)
    const issuerId = items[0]?.issuer_id;
    if (issuerId) {
      const writeAccess = await checkIssuerWriteAccess(supabase, issuerId);
      if (!writeAccess.allowed) {
        return NextResponse.json(
          { error: writeAccess.reason || 'Cannot modify positions for suspended issuer' },
          { status: 403 }
        );
      }
    }

    // Map payload
    const payload = items.map((pos) => ({
      issuer_id: pos.issuer_id,
      shareholder_id: pos.shareholder_id,
      security_id: pos.security_id || null,
      shares_owned: pos.shares_owned || 0,
      position_date: pos.position_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    console.log("Shareholder positions payload sample:", payload[0]);

    const { data, error } = await supabase
      .from("shareholder_positions_new")
      .upsert(payload, {
        onConflict: 'issuer_id,shareholder_id,security_id,position_date'
      })
      .select();

    if (error) {
      console.error("Error inserting shareholder positions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, count: data.length, records: data },
      { status: 201 }
    );
  } catch (err) {
    console.error("API Error (shareholder-positions POST):", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
