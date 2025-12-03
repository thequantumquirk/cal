import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
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

    // Get total companies
    const { count: totalCompanies } = await supabase
      .from("issuers_new")
      .select("*", { count: "exact", head: true })

    // Get active companies (assuming there's a status field, otherwise all are active)
    const { count: activeCompanies } = await supabase
      .from("issuers_new")
      .select("*", { count: "exact", head: true })

    // Get pending invites
    const { count: pendingInvites } = await supabase
      .from("invited_users_new")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      total_companies: totalCompanies || 0,
      active_companies: activeCompanies || 0,
      pending_invites: pendingInvites || 0,
    })
  } catch (err) {
    console.error("API Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
