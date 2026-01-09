// File: app/api/securities/route.js
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkIssuerWriteAccess } from "@/lib/issuer-utils"

// ⚡ Cache securities data for 30 minutes (rarely changes)
export const revalidate = 1800

// GET securities by issuer
// ⚡ OPTIMIZED: Uses database indexes + client-side caching + route caching
export async function GET(request) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get("issuerId")

    if (!issuerId) {
      return NextResponse.json(
        { error: "Issuer ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ⚡ FAST: Uses idx_securities_issuer_status_active index
    const { data: securities, error } = await supabase
      .from("securities_new")
      .select("id, issuer_id, cusip, issue_name, issue_ticker, class_name, trading_platform, total_authorized_shares, status, created_at")
      .eq("issuer_id", issuerId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching securities:", error)
      return NextResponse.json(
        { error: "Failed to fetch securities", details: error.message },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ GET /api/securities - ${securities?.length || 0} records in ${duration}ms`)

    // Client-side caching via HTTP headers
    return NextResponse.json(securities || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error("❌ Error in GET /securities:", err, `(${duration}ms)`)
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    )
  }
}

// POST create a new security (with suspended check)
export async function POST(request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // --- Auth check ---
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      issuer_id,
      class_name,
      cusip,
      issue_name,
      issue_ticker,
      total_authorized_shares,
      trading_platform,
      // issuance_type is ignored for now
    } = body

    // --- Validation ---
    if (!issuer_id || !class_name || !cusip || !issue_name) {
      return NextResponse.json(
        { error: "issuer_id, class_name, cusip, and issue_name are required" },
        { status: 400 }
      )
    }

    // Check if issuer is suspended
    const writeAccess = await checkIssuerWriteAccess(supabase, issuer_id)
    if (!writeAccess.allowed) {
      return NextResponse.json(
        { error: writeAccess.reason || 'Cannot modify suspended issuer' },
        { status: 403 }
      )
    }

    // --- Check for duplicate CUSIP ---
    const { data: existingSecurity, error: checkError } = await supabase
      .from("securities_new")
      .select("id")
      .eq("issuer_id", issuer_id)
      .eq("cusip", cusip)
      .maybeSingle()

    if (checkError) {
      console.error("❌ Error checking existing security:", checkError)
      return NextResponse.json(
        { error: "Error validating existing securities" },
        { status: 500 }
      )
    }

    if (existingSecurity) {
      console.warn("⚠️ Duplicate CUSIP detected:", { issuer_id, cusip })
      return NextResponse.json(
        { error: "CUSIP already exists for this issuer" },
        { status: 400 }
      )
    }

    // --- Prepare insert payload ---
    
    
    // Normalize status if provided, default to "active"
let normalizedStatus = "active";
if (body.status) {
  normalizedStatus =
    typeof body.status === "string" && body.status.toLowerCase() === "active"
      ? "active"
      : body.status.toLowerCase();
}

const securityData = {
  issuer_id,
  class_name,
  cusip,
  issue_name,
  issue_ticker: issue_ticker || null,
  total_authorized_shares: total_authorized_shares || null,
  trading_platform: trading_platform || null,
  created_by: user.id,
  status: normalizedStatus,
};


    // --- Insert new record ---
    const { data: newSecurity, error: insertError } = await supabase
      .from("securities_new")
      .insert(securityData)
      .select()
      .single()

    if (insertError) {
      console.error("❌ Error creating security:", insertError)
      return NextResponse.json(
        { error: "Failed to create security" },
        { status: 500 }
      )
    }

    console.log("✅ Security created:", newSecurity)
    return NextResponse.json(newSecurity, { status: 201 })
  } catch (err) {
    console.error("❌ Error in POST /securities:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
