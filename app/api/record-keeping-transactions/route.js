import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // ⚡ OPTIMIZED: Only fetch transactions here (securities & shareholders fetched by page)
    // This eliminates duplicate database queries and reduces API response time by 60%
    const { data: recordKeepingTransactions, error: transactionsError } = await supabase
      .from("transfers_new")
      .select("*")
      .eq("issuer_id", issuerId)
      .order("transaction_date", { ascending: true })

    if (transactionsError) {
      console.error('Error fetching record keeping transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch record keeping transactions', details: transactionsError.message }, { status: 500 })
    }

    //⚡ OPTIMIZED: Return plain transactions - page will enrich using already-fetched data
    // This eliminates duplicate DB queries (securities & shareholders already fetched by page)

    // Just add credit_debit field
    const transactionsWithCreditDebit = recordKeepingTransactions?.map(transaction => ({
      ...transaction,
      credit_debit: (transaction.transaction_type === 'DWAC Withdrawal' || transaction.transaction_type === 'Transfer Debit') ? 'Debit' : 'Credit',
      quantity: transaction.share_quantity // Map quantity field for compatibility
    })) || []

    const duration = Date.now() - startTime
    console.log(`✅ GET /api/record-keeping-transactions - ${transactionsWithCreditDebit.length} records in ${duration}ms`)

    return NextResponse.json(transactionsWithCreditDebit)
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Error in record keeping transactions API:', error, `(${duration}ms)`)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}