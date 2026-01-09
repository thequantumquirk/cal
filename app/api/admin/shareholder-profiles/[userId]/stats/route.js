import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch stats for a specific shareholder user (superadmin only)
export async function GET(request, { params }) {
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

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch all shareholder records for this user
    const { data: shareholderRecords, error: shareholdersError } = await supabase
      .from("shareholders_new")
      .select(`
        id,
        issuer_id,
        account_number,
        first_name,
        last_name,
        issuers_new:issuer_id (
          id,
          issuer_name
        )
      `)
      .eq("user_id", userId);

    if (shareholdersError) {
      console.error("Error fetching shareholder records:", shareholdersError);
      throw shareholdersError;
    }

    if (!shareholderRecords || shareholderRecords.length === 0) {
      return NextResponse.json({
        total_issuers: 0,
        total_shares: 0,
        holdings: []
      });
    }

    // Get shareholder IDs
    const shareholderIds = shareholderRecords.map(s => s.id);

    // Fetch transactions for all shareholder records to calculate shares
    const { data: transactions, error: txError } = await supabase
      .from("transfers_new")
      .select("shareholder_id, share_quantity, credit_debit, transaction_type, cusip")
      .in("shareholder_id", shareholderIds);

    if (txError) {
      console.error("Error fetching transactions:", txError);
    }

    // Calculate shares per shareholder
    const sharesMap = new Map();
    transactions?.forEach(tx => {
      const currentShares = sharesMap.get(tx.shareholder_id) || 0;
      const quantity = Number(tx.share_quantity) || 0;

      let adjustment = quantity;
      if (tx.credit_debit) {
        const cdStr = String(tx.credit_debit).toLowerCase();
        if (cdStr.includes('debit') || cdStr.includes('withdrawal')) {
          adjustment = -quantity;
        }
      } else if (tx.transaction_type === "DWAC Withdrawal" || tx.transaction_type === "Transfer Debit") {
        adjustment = -quantity;
      }

      sharesMap.set(tx.shareholder_id, currentShares + adjustment);
    });

    // Build holdings array
    const holdings = shareholderRecords.map(sh => ({
      shareholder_id: sh.id,
      issuer_id: sh.issuer_id,
      issuer_name: sh.issuers_new?.issuer_name || "Unknown",
      account_number: sh.account_number,
      first_name: sh.first_name,
      last_name: sh.last_name,
      shares: Math.max(0, sharesMap.get(sh.id) || 0)
    }));

    // Calculate totals
    const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
    const uniqueIssuers = new Set(holdings.map(h => h.issuer_id)).size;

    return NextResponse.json({
      total_issuers: uniqueIssuers,
      total_shares: totalShares,
      holdings
    });
  } catch (err) {
    console.error("GET Shareholder Stats Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
