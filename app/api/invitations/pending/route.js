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

    // Get pending invitations with issuer details
    const { data: invitations, error: fetchError } = await supabase
      .from("invited_users_new")
      .select(`
        *,
        issuers_new (
          display_name
        )
      `)
      .order("invited_at", { ascending: false })

    if (fetchError) {
      console.error("Fetch error:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Format the response
    const formattedInvitations = invitations?.map(invite => ({
      ...invite,
      issuer_display_name: invite.issuers_new?.display_name
    })) || []

    return NextResponse.json(formattedInvitations)
  } catch (err) {
    console.error("API Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
