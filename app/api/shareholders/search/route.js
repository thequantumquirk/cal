import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/shareholders/search
 * Search for shareholders by email, name, or account number
 * Query params:
 *   - q: search query
 *   - issuerId: optional filter by issuer
 *   - limit: optional limit (default 20)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("q") || ""
        const issuerId = searchParams.get("issuerId")
        const limit = parseInt(searchParams.get("limit") || "25")
        const page = parseInt(searchParams.get("page") || "1")
        const offset = (page - 1) * limit
        const sortBy = searchParams.get("sortBy") || "first_name" // first_name or email

        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Build base query
        let dbQuery = supabase
            .from("shareholders_new")
            .select(`
        id,
        issuer_id,
        first_name,
        last_name,
        email,
        account_number,
        holder_type,
        user_id,
        issuers_new:issuer_id (
          id,
          issuer_name,
          display_name
        )
      `, { count: 'exact' })

        // Apply filters
        if (query && query.length >= 2) {
            dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,account_number.ilike.%${query}%`)
        }

        if (issuerId && issuerId !== "all") {
            dbQuery = dbQuery.eq("issuer_id", issuerId)
        }

        // Apply sorting
        if (sortBy === "email") {
            dbQuery = dbQuery.order("email", { ascending: true }).order("first_name", { ascending: true })
        } else {
            dbQuery = dbQuery.order("first_name", { ascending: true })
        }

        // Apply pagination
        const { data: shareholders, count, error } = await dbQuery
            .range(offset, offset + limit - 1)

        if (error) {
            console.error("Error searching shareholders:", error)
            return NextResponse.json({ error: "Failed to search shareholders" }, { status: 500 })
        }

        return NextResponse.json({
            shareholders: shareholders || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })
    } catch (err) {
        console.error("API Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
