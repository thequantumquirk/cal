import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const shareholderId = searchParams.get('shareholderId')
    const userEmail = searchParams.get('userEmail')

    let shareholder = null

    if (shareholderId) {
      const { data, error } = await supabase
        .from("shareholders_new")
        .select("*")
        .eq("id", shareholderId)
        .single()

      if (error) {
        console.error("Error fetching shareholder by ID:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      shareholder = data
    } else if (userEmail) {
      const { data, error } = await supabase
        .from("shareholders_new")
        .select("*")
        .eq("email", userEmail)
        .single()

      if (error) {
        console.error("Error fetching shareholder by email:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      shareholder = data
    }

    if (!shareholder) {
      return NextResponse.json({
        shareholder: null,
        transactions: [],
        currentShares: 0,
        issuer: null
      })
    }

    // ⚡ OPTIMIZED: Fetch issuer and transactions in parallel
    const [issuerRes, transactionsRes] = await Promise.all([
      supabase
        .from("issuers_new")
        .select("*")
        .eq("id", shareholder.issuer_id)
        .single(),
      supabase
        .from("transfers_new")
        .select("*")
        .eq("shareholder_id", shareholder.id)
        .order("transaction_date", { ascending: false })
    ])

    const issuer = issuerRes.data
    const transactions = transactionsRes.data || []

    // Calculate current shares
    let currentShares = 0
    if (transactions) {
      currentShares = transactions.reduce((total, transaction) => {
        const quantity = Number(transaction.share_quantity) || 0

        // 1. Check credit_debit column first
        if (transaction.credit_debit) {
          const cdStr = String(transaction.credit_debit).toLowerCase()
          if (cdStr.includes('debit') || cdStr.includes('withdrawal')) {
            return total - quantity
          }
          return total + quantity
        }

        // 2. Fallback to transaction_type
        const multiplier =
          transaction.transaction_type === "DWAC Withdrawal" ||
            transaction.transaction_type === "Transfer Debit"
            ? -1
            : 1
        return total + quantity * multiplier
      }, 0)
    }

    return NextResponse.json({
      shareholder,
      transactions,
      currentShares: Math.max(0, currentShares),
      issuer: issuer || null
    })
  } catch (err) {
    console.error("API Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
