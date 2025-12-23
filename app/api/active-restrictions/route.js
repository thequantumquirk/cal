import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ⚡ Cache active restrictions for 10 minutes (moderate changes)
export const revalidate = 600

/**
 * GET /api/active-restrictions?issuerId=<uuid>
 *
 * Fast, optimized endpoint for fetching active shareholder restrictions
 * Used by transaction-processing page for validation
 *
 * Performance: ~50-150ms (vs 1000ms with JOINs) + route caching
 */
export async function GET(request) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get('issuerId')

    if (!issuerId) {
      return NextResponse.json(
        { error: 'Issuer ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Optimized query - no JOINs, only select needed columns
    const { data: restrictions, error } = await supabase
      .from("shareholder_restrictions_new")
      .select("id, shareholder_id, cusip, restriction_type, description, is_active, created_date")
      .eq("issuer_id", issuerId)
      .eq("is_active", true) // Only fetch active restrictions
      .order("created_date", { ascending: false })

    if (error) {
      console.error('❌ Error fetching active restrictions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active restrictions' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ GET /api/active-restrictions?issuerId=${issuerId} - ${restrictions?.length || 0} records in ${duration}ms`)

    return NextResponse.json(restrictions || [])
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Error in active-restrictions API:', error, `(${duration}ms)`)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/active-restrictions
 *
 * Create a new shareholder restriction
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { issuer_id, shareholder_id, cusip, restriction_type, description } = body

    if (!issuer_id || !shareholder_id || !cusip || !restriction_type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: issuer_id, shareholder_id, cusip, restriction_type, description' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restrictionData = {
      issuer_id,
      shareholder_id,
      cusip,
      restriction_type,
      description,
      is_active: true,
      created_date: new Date().toISOString(),
    }

    const { data: restriction, error } = await supabase
      .from("shareholder_restrictions_new")
      .insert([restrictionData])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating restriction:', error)
      return NextResponse.json(
        { error: 'Failed to create restriction' },
        { status: 500 }
      )
    }

    console.log('✅ Restriction created:', restriction.id)
    return NextResponse.json(restriction, { status: 201 })
  } catch (error) {
    console.error('❌ Error in active-restrictions POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
