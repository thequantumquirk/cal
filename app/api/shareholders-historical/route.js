import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getCurrentUserRole } from "@/lib/actions"

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

    // Get user role
    const userRole = await getCurrentUserRole()

    // Get query params
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get('issuerId')

    // For superadmins without issuer context, show global data
    if (userRole === 'superadmin' && !issuerId) {
      const { data: shareholders, error } = await supabase
        .from("shareholders_new")
        .select("*, issuers_new(issuer_name)")
        .order("last_name")

      if (error) {
        console.error("Error fetching all shareholders:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(shareholders || [])
    }

    // For issuer-specific data
    if (!issuerId) {
      return NextResponse.json([]) // No issuer selected, no data
    }

    const { data: shareholders, error } = await supabase
      .from("shareholders_new")
      .select("*, issuers_new(issuer_name)")
      .eq("issuer_id", issuerId)
      .order("last_name")

    if (error) {
      console.error("Error fetching issuer shareholders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(shareholders || [])
  } catch (err) {
    console.error("API Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
