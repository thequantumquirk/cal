import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ⚡ OPTIMIZED: Uses idx_transfers_issuer_date index for fast queries
// NO CACHING: Always returns fresh data
export async function GET(request) {
  const startTime = Date.now()

  try {
    console.log('🔍 Record keeping transactions API called')
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get('issuerId')
    console.log('🔍 Requested issuer ID:', issuerId)

    if (!issuerId) {
      return NextResponse.json({ error: 'Issuer ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // ⚡ FAST: Uses idx_transfers_issuer_date index with joins for enriched data
    const { data: recordKeepingTransactions, error: transactionsError } = await supabase
      .from("transfers_new")
      .select(`
        *,
        shareholders_new!shareholder_id(
          id,
          account_number,
          first_name,
          last_name,
          address,
          city,
          state,
          zip
        )
      `)
      .eq("issuer_id", issuerId)
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true })

    if (transactionsError) {
      console.error("❌ Error fetching transactions:", transactionsError)
      return NextResponse.json(
        { error: "Failed to fetch transactions", details: transactionsError.message },
        { status: 500 }
      )
    }

    // Add credit_debit field and flatten shareholder data for easier access
    const transactionsWithCreditDebit = recordKeepingTransactions?.map(transaction => ({
      ...transaction,
      credit_debit: (transaction.transaction_type === 'DWAC Withdrawal' || transaction.transaction_type === 'Transfer Debit') ? 'Debit' : 'Credit',
      quantity: transaction.share_quantity, // Map quantity field for compatibility
      // Flatten shareholder data
      shareholder_name: transaction.shareholders_new
        ? `${transaction.shareholders_new.first_name || ''} ${transaction.shareholders_new.last_name || ''}`.trim()
        : null,
      account_number: transaction.shareholders_new?.account_number || null,
      first_name: transaction.shareholders_new?.first_name || null,
      last_name: transaction.shareholders_new?.last_name || null,
      address: transaction.shareholders_new?.address || null,
      city: transaction.shareholders_new?.city || null,
      state: transaction.shareholders_new?.state || null,
      zip: transaction.shareholders_new?.zip || null,
    })) || []

    const duration = Date.now() - startTime
    console.log(`✅ GET /api/record-keeping-transactions - ${transactionsWithCreditDebit.length} records in ${duration}ms`)

    return NextResponse.json(transactionsWithCreditDebit, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Error in record keeping transactions API:', error, `(${duration}ms)`)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}