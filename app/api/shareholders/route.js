import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkIssuerWriteAccess } from "@/lib/issuer-utils"

// ⚡ Cache shareholders for 5 minutes (changes periodically)
export const revalidate = 300

export async function GET(request) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const issuerId = searchParams.get("issuerId") || searchParams.get("issuer_id")

    const supabase = await createClient()

    // If caller requested shareholders by issuerId (used by the UI), return an array
    if (issuerId) {
      // ⚡ FAST: Uses idx_shareholders_new_issuer index
      const { data: shareholders, error } = await supabase
        .from("shareholders_new")
        .select(
          "id, issuer_id, account_number, first_name, last_name, address, email, phone, holder_type, ownership_percentage, created_at, updated_at"
        )
        .eq("issuer_id", issuerId)

      if (error) {
        console.error("Error fetching shareholders by issuerId:", error)
        return NextResponse.json({ error: "Failed to fetch shareholders", details: error.message }, { status: 500 })
      }

      const duration = Date.now() - startTime
      console.log(`✅ GET /api/shareholders - ${shareholders?.length || 0} records in ${duration}ms`)

      // Return the raw array with smart caching headers
      // must-revalidate ensures browser refresh gets fresh data
      // stale-while-revalidate allows instant display while checking for updates
      return NextResponse.json(shareholders || [], {
        headers: {
          'Cache-Control': 'private, max-age=60, must-revalidate, stale-while-revalidate=30',
        }
      })
    }

    // Fallback: support existing email-based profile + holdings lookup
    if (!email) {
      return NextResponse.json({ error: "Email or issuerId is required" }, { status: 400 })
    }

    // 0. Lazy Link: If user is authenticated and email matches, link records
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.email && user.email.toLowerCase() === email.toLowerCase()) {
      await supabase
        .from("shareholders_new")
        .update({ user_id: user.id })
        .eq("email", email)
        .is("user_id", null)
    }

    // 1. Get ALL shareholder profiles for this email
    const { data: profiles, error: profileError } = await supabase
      .from("shareholders_new")
      .select("id, first_name, last_name, account_number, holder_type, address, email, phone, ownership_percentage, issuer_id")
      .eq("email", email)

    if (profileError) {
      console.error("Error fetching profiles:", profileError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "Shareholder not found" }, { status: 404 })
    }

    // Use the first profile for display purposes (name, address, etc.)
    const mainProfile = profiles[0]
    const shareholderIds = profiles.map(p => p.id)

    // ⚡⚡ SUPER OPTIMIZED: Fetch user holdings with ownership % calculated in a single query
    // First get the user's security IDs to limit our aggregation scope
    const { data: holdingsRaw, error: holdingsError } = await supabase
      .from("shareholder_positions_new")
      .select("id, shares_owned, position_date, issuer_id, security_id, shareholder_id")
      .in("shareholder_id", shareholderIds)

    if (holdingsError) {
      console.error("Error fetching holdings:", holdingsError)
      return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 })
    }

    // Get unique security IDs from user's holdings
    const userSecurityIds = [...new Set(holdingsRaw?.map(h => h.security_id) || [])]

    // ⚡⚡ OPTIMIZED: Use database aggregation to calculate total outstanding shares
    // Only for securities this user owns (not ALL securities in database)
    const { data: securityTotals } = await supabase.rpc('get_security_totals', {
      security_ids: userSecurityIds
    }).then(result => {
      // If RPC doesn't exist, fall back to manual aggregation (but only for user's securities)
      if (result.error) {
        return supabase
          .from("shareholder_positions_new")
          .select("security_id, shares_owned")
          .in("security_id", userSecurityIds)
      }
      return result
    })

    // Calculate totals by security_id
    const outstandingBySecurityId = {}
    if (securityTotals) {
      securityTotals.forEach(p => {
        if (!outstandingBySecurityId[p.security_id]) {
          outstandingBySecurityId[p.security_id] = 0
        }
        outstandingBySecurityId[p.security_id] += (p.shares_owned || 0)
      })
    }

    // Get unique issuer IDs from holdings
    const userIssuerIds = [...new Set(holdingsRaw?.map(h => h.issuer_id) || [])]

    // ⚡ Fetch issuers, securities, restrictions, and templates in parallel
    const [
      { data: issuers },
      { data: securities },
      { data: manualRestrictions },
      { data: transactionRestrictions },
      { data: restrictionTemplates }
    ] = await Promise.all([
      supabase.from("issuers_new").select("id, issuer_name"),
      supabase.from("securities_new").select("id, class_name, issue_name, cusip, total_authorized_shares"),
      // Fetch manual restrictions for these shareholders
      supabase
        .from("transaction_restrictions_new")
        .select("shareholder_id, restriction_id, cusip, restricted_shares")
        .in("shareholder_id", shareholderIds),
      // Fetch transaction-based restrictions (from transfers_new with restriction_id)
      supabase
        .from("transfers_new")
        .select("shareholder_id, restriction_id, cusip, share_quantity")
        .in("shareholder_id", shareholderIds)
        .not("restriction_id", "is", null),
      // Fetch restriction templates for these issuers
      supabase
        .from("restrictions_templates_new")
        .select("id, issuer_id, restriction_type, restriction_name, description")
        .in("issuer_id", userIssuerIds)
    ])

    // Build a map of restriction_id -> template info
    const templateMap = {}
    ;(restrictionTemplates || []).forEach(t => {
      templateMap[t.id] = t
    })

    // Build a map of shareholder_id + cusip -> { is_restricted, legend_code }
    // Combine manual and transaction-based restrictions
    const restrictionsByKey = {}

    // Process manual restrictions
    ;(manualRestrictions || []).forEach(r => {
      const key = `${r.shareholder_id}-${r.cusip}`
      if (!restrictionsByKey[key]) {
        restrictionsByKey[key] = {
          is_restricted: true,
          legend_codes: new Set(),
          total_restricted_shares: 0
        }
      }
      restrictionsByKey[key].total_restricted_shares += r.restricted_shares || 0
      const template = templateMap[r.restriction_id]
      if (template?.restriction_type) {
        restrictionsByKey[key].legend_codes.add(template.restriction_type)
      }
    })

    // Process transaction-based restrictions
    ;(transactionRestrictions || []).forEach(r => {
      const key = `${r.shareholder_id}-${r.cusip}`
      if (!restrictionsByKey[key]) {
        restrictionsByKey[key] = {
          is_restricted: true,
          legend_codes: new Set(),
          total_restricted_shares: 0
        }
      }
      restrictionsByKey[key].total_restricted_shares += r.share_quantity || 0
      const template = templateMap[r.restriction_id]
      if (template?.restriction_type) {
        restrictionsByKey[key].legend_codes.add(template.restriction_type)
      }
    })

    // ⚡ Merge data
    const holdings = (holdingsRaw || []).map(h => {
      const issuer = issuers?.find(i => i.id === h.issuer_id) || null
      const security = securities?.find(s => s.id === h.security_id) || null

      // Calculate ownership % using TOTAL outstanding shares
      let ownership_percentage = 0
      const totalOutstanding = outstandingBySecurityId[h.security_id] || 0
      if (totalOutstanding > 0) {
        ownership_percentage = (h.shares_owned / totalOutstanding) * 100
      }

      // Look up restriction info by shareholder_id + cusip
      const cusip = security?.cusip
      const restrictionKey = `${h.shareholder_id}-${cusip}`
      const restrictionInfo = restrictionsByKey[restrictionKey]

      // Determine is_restricted and legend_code
      const is_restricted = restrictionInfo ? true : false
      // Join multiple legend codes with comma if there are multiple
      const legend_code = restrictionInfo
        ? Array.from(restrictionInfo.legend_codes).join(', ') || null
        : null

      return {
        ...h,
        issuer,
        security,
        ownership_percentage: Number(ownership_percentage.toFixed(2)),
        is_restricted,
        legend_code
      }
    })

    const duration = Date.now() - startTime
    console.log(`⏱️ GET /api/shareholders?email=${email} took ${duration}ms`)

    return NextResponse.json({
      profile: mainProfile, // Return the main profile for display
      profiles: profiles,   // Return all profiles if frontend wants to use them
      holdings
    }, {
      headers: {
        // private = user-specific data, don't cache in CDN
        // max-age=60 = cache for 60 seconds
        // must-revalidate = ALWAYS revalidate on browser refresh (guarantees fresh data)
        // stale-while-revalidate=30 = serve stale cache while fetching fresh in background
        'Cache-Control': 'private, max-age=60, must-revalidate, stale-while-revalidate=30',
      }
    })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error("API Error in /shareholders:", err, `(${duration}ms)`)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ✅ POST shareholders - bulk insert (with suspended check)
export async function POST(req) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Accept either a single object or an array
    const isArray = Array.isArray(body)
    const items = isArray ? body : [body]

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No shareholders provided" }, { status: 400 })
    }

    // Check if issuer is suspended
    const issuerId = items[0]?.issuer_id
    if (issuerId) {
      const writeAccess = await checkIssuerWriteAccess(supabase, issuerId)
      if (!writeAccess.allowed) {
        return NextResponse.json(
          { error: writeAccess.reason || 'Cannot modify suspended issuer' },
          { status: 403 }
        )
      }
    }

    // Map payload
    const payload = items.map((sh) => ({
      issuer_id: sh.issuer_id,
      account_number: sh.account_number || null,
      first_name: sh.first_name || sh.shareholder_name || null,
      last_name: sh.last_name || null,
      address: sh.address || null,
      city: sh.city || null,
      state: sh.state || null,
      zip: sh.zip || null,
      country: sh.country || null,
      taxpayer_id: sh.taxpayer_id || null,
      tin_status: sh.tin_status || null,
      email: sh.email || null,
      phone: sh.phone || null,
      dob: sh.dob || sh.date_of_birth || null,
      holder_type: sh.holder_type || null,
      lei: sh.lei || null,
      ofac_date: sh.ofac_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from("shareholders_new")
      .insert(payload)
      .select()

    if (error) {
      console.error("Error inserting shareholders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If caller sent a single object, return single record for convenience
    if (!isArray) {
      return NextResponse.json(data[0], { status: 201 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("API Error (shareholders POST):", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
