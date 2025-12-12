import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ⚡ OPTIMIZED: Fetches transactions for a specific issuer and shareholder
export async function GET(request, { params }) {
  const startTime = Date.now()
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get logged-in user (shareholder)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Match logged-in user → shareholder_id for this issuer
    const { data: shareholder, error: shError } = await supabase
      .from("shareholders_new")
      .select("id")
      .eq("email", user.email)
      .eq("issuer_id", id)
      .maybeSingle()  // Use maybeSingle to avoid error if not found

    if (shError) {
      console.error("Shareholder lookup error:", shError)
      return NextResponse.json({ error: "Failed to find shareholder" }, { status: 500 })
    }

    if (!shareholder) {
      // No shareholder record for this issuer - return empty transactions
      return NextResponse.json({ transactions: [] })
    }

    // Fetch transactions from transfers_new (matching record-keeping pattern)
    const { data: transactions, error } = await supabase
      .from("transfers_new")
      .select(`
        id,
        issuer_id,
        cusip,
        transaction_type,
        share_quantity,
        transaction_date,
        status,
        certificate_type,
        notes,
        created_at
      `)
      .eq("issuer_id", id)
      .eq("shareholder_id", shareholder.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Transaction fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    console.log(`⏱️ GET /api/issuers/${id}/transactions took ${duration}ms (${transactions?.length || 0} records)`)

    return NextResponse.json({ transactions: transactions || [] })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error("Transactions API error:", err, `(${duration}ms)`)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
