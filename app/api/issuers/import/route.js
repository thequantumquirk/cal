import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function POST(req) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      issuer_name,
      address,
      telephone,
      tax_id,
      incorporation,
      underwriter,
      share_info,
      notes,
      forms_sl_status,
      timeframe_for_separation,
      separation_ratio,
      split_security_type,
      exchange_platform,
      timeframe_for_bc,
      us_counsel,
      offshore_counsel,
      display_name,
      description,
      override,
    } = body;

    // Step 1: Check if issuer already exists
    const { data: existingIssuer, error: findError } = await supabase
      .from("issuers_new")
      .select("*")
      .eq("issuer_name", issuer_name)
      .maybeSingle();

    if (findError) {
      console.error("Find error:", findError);
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    // Step 2: If exists and no override → notify client
    if (existingIssuer && !override) {
      return NextResponse.json({ exists: true, issuer: existingIssuer }, { status: 200 });
    }

    // Build payload
    console.log(`📥 Received split_security_type: "${split_security_type}" for issuer: ${issuer_name}`);

    const newIssuer = {
      issuer_name: issuer_name || "Unnamed Issuer",
      address: address || null,
      telephone: telephone || null,
      tax_id: tax_id || null,
      incorporation: incorporation || null,
      underwriter: underwriter || null,
      share_info: share_info || null,
      notes: notes || null,
      forms_sl_status: forms_sl_status || null,
      timeframe_for_separation: timeframe_for_separation || null,
      separation_ratio: separation_ratio || null,
      split_security_type: split_security_type || 'Warrant', // Auto-detected during import
      exchange_platform: exchange_platform || null,
      timeframe_for_bc: timeframe_for_bc || null,
      us_counsel: us_counsel || null,
      offshore_counsel: offshore_counsel || null,
      display_name: display_name || issuer_name || null,
      description: description || null,
      created_by: user.id,
    };

    console.log(`💾 Saving to DB with split_security_type: "${newIssuer.split_security_type}"`);

    // Step 3: Insert or Update
    let result;
    if (existingIssuer && override) {
      console.log("🔄 OVERRIDE MODE: Performing clean slate deletion for issuer:", existingIssuer.id);

      // ✅ CLEAN SLATE OVERRIDE: Delete all related data in correct order (children first)
      const issuerId = existingIssuer.id;

      try {
        // Delete in order: children → parent (avoid FK violations)
        console.log("  🗑️  Deleting transfers_new...");
        const { error: transfersError } = await supabase
          .from("transfers_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (transfersError) throw new Error(`Transfers deletion failed: ${transfersError.message}`);

        console.log("  🗑️  Deleting recordkeeping_summary_new...");
        const { error: recordkeepingError } = await supabase
          .from("recordkeeping_summary_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (recordkeepingError) throw new Error(`Recordkeeping deletion failed: ${recordkeepingError.message}`);

        console.log("  🗑️  Deleting securities_new...");
        const { error: securitiesError } = await supabase
          .from("securities_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (securitiesError) throw new Error(`Securities deletion failed: ${securitiesError.message}`);

        console.log("  🗑️  Deleting shareholder_positions_new...");
        const { error: positionsError } = await supabase
          .from("shareholder_positions_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (positionsError) throw new Error(`Shareholder positions deletion failed: ${positionsError.message}`);

        // ✅ FIX: Delete transaction_restrictions_new BEFORE shareholders (FK constraint)
        console.log("  🗑️  Deleting transaction_restrictions_new...");
        const { error: transactionRestrictionsError } = await supabase
          .from("transaction_restrictions_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (transactionRestrictionsError) throw new Error(`Transaction restrictions deletion failed: ${transactionRestrictionsError.message}`);

        console.log("  🗑️  Deleting shareholders_new...");
        const { error: shareholdersError } = await supabase
          .from("shareholders_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (shareholdersError) throw new Error(`Shareholders deletion failed: ${shareholdersError.message}`);

        console.log("  🗑️  Deleting officers_new...");
        const { error: officersError } = await supabase
          .from("officers_new")
          .delete()
          .eq("issuer_id", issuerId);
        if (officersError) throw new Error(`Officers deletion failed: ${officersError.message}`);

        console.log("  🗑️  Deleting split_events...");
        const { error: splitsError } = await supabase
          .from("split_events")
          .delete()
          .eq("issuer_id", issuerId);
        if (splitsError) throw new Error(`Splits deletion failed: ${splitsError.message}`);

        console.log("  🗑️  Deleting restrictions...");
        const { error: restrictionsError } = await supabase
          .from("restrictions")
          .delete()
          .eq("issuer_id", issuerId);
        if (restrictionsError) throw new Error(`Restrictions deletion failed: ${restrictionsError.message}`);

        console.log("  ✅ All related data deleted successfully");
      } catch (deleteError) {
        console.error("❌ Clean slate deletion failed:", deleteError);
        return NextResponse.json(
          { error: `Failed to delete existing data: ${deleteError.message}` },
          { status: 500 }
        );
      }

      // Now update the issuer record
      result = await supabase
        .from("issuers_new")
        .update(newIssuer)
        .eq("issuer_name", issuer_name)
        .select();

      // Log Audit: Update (Override)
      await logAudit({
        action: "UPDATE_ISSUER",
        entityType: "issuer",
        entityId: existingIssuer.id,
        issuerId: existingIssuer.id,
        userId: user.id,
        details: {
          name: issuer_name,
          type: "override_import"
        }
      });
    } else {
      result = await supabase.from("issuers_new").insert(newIssuer).select();

      if (result.data?.[0]) {
        // Log Audit: Create
        await logAudit({
          action: "CREATE_ISSUER",
          entityType: "issuer",
          entityId: result.data[0].id,
          issuerId: result.data[0].id,
          userId: user.id,
          details: {
            name: issuer_name,
            type: "import"
          }
        });
      }
    }

    if (result.error) {
      console.error("DB Insert/Update Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, issuer: result.data?.[0] || null },
      { status: existingIssuer && override ? 200 : 201 }
    );
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
