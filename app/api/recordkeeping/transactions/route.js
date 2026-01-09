import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkIssuerTransactionAccess } from "@/lib/issuer-utils";

// POST -> bulk insert into transfers_new
export async function POST(req) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // --- Auth check ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: "No transactions provided" },
        { status: 400 }
      );
    }

    // Check if issuer is suspended or pending (transactions blocked for both)
    const issuerId = body[0]?.issuer_id;
    if (issuerId) {
      const transactionAccess = await checkIssuerTransactionAccess(supabase, issuerId);
      if (!transactionAccess.allowed) {
        return NextResponse.json(
          { error: transactionAccess.reason || 'Cannot add transactions for this issuer' },
          { status: 403 }
        );
      }
    }

    // ✅ Map parsed Excel fields to transfers_new schema
    const payload = body.map((tx) => {
      // Determine if this is a debit transaction
      const txType = (tx.transaction_type || '').toLowerCase();
      const creditDebit = (tx.credit_debit || '').toLowerCase();
      const isDebit = creditDebit.includes('debit') ||
                      txType.includes('withdrawal') ||
                      txType.includes('debit');

      // Get the absolute quantity
      const rawQty = Number.isFinite(tx.share_quantity) ? tx.share_quantity : 0;
      const absQty = Math.abs(rawQty);

      // Apply sign: debits = negative, credits = positive
      const signedQty = isDebit ? -absQty : absQty;

      return {
        issuer_id: tx.issuer_id || null, // must come from issuer save
        cusip: tx.cusip || null,
        transaction_type: tx.transaction_type || null,
        share_quantity: signedQty,  // ✅ Now correctly signed based on credit_debit/transaction_type
        shareholder_id: /^[0-9a-fA-F-]{36}$/.test(tx.shareholder_id)
          ? tx.shareholder_id
          : null,
        restriction_id: null,
        transaction_date: tx.transaction_date || null, // already formatted
        status: tx.status || "ACTIVE",
        notes: tx.notes || null,
        certificate_type: tx.certificate_type || "Book Entry",
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    console.log("Sample payload for transfers_new:", payload[0]);

    const { data, error } = await supabase
      .from("transfers_new")
      .insert(payload)
      .select();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, count: data.length, records: data },
      { status: 201 }
    );
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
