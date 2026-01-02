import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/users/[userId]/shareholders
 * Fetch all shareholder records linked to this user (across all issuers)
 */
export async function GET(request, { params }) {
    try {
        const { userId } = await params
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Fetch all shareholders linked to this user
        const { data: shareholders, error } = await supabase
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
      `)
            .eq("user_id", userId)
            .order("issuer_id")

        if (error) {
            console.error("Error fetching linked shareholders:", error)
            return NextResponse.json({ error: "Failed to fetch shareholders" }, { status: 500 })
        }

        return NextResponse.json({ shareholders: shareholders || [] })
    } catch (err) {
        console.error("API Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * POST /api/users/[userId]/shareholders
 * Link a shareholder record to this user
 * Body: { shareholderId: string }
 */
export async function POST(request, { params }) {
    try {
        const { userId } = await params
        const { shareholderId } = await request.json()
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!shareholderId) {
            return NextResponse.json({ error: "shareholderId is required" }, { status: 400 })
        }

        // Check if shareholder exists
        const { data: shareholder, error: fetchError } = await supabase
            .from("shareholders_new")
            .select("id, user_id, first_name, last_name, email")
            .eq("id", shareholderId)
            .single()

        if (fetchError || !shareholder) {
            return NextResponse.json({ error: "Shareholder not found" }, { status: 404 })
        }

        // Check if already linked to another user
        if (shareholder.user_id && shareholder.user_id !== userId) {
            return NextResponse.json({
                error: "This shareholder is already linked to another user",
                linkedToUserId: shareholder.user_id
            }, { status: 409 })
        }

        // Link shareholder to user
        const { data: updatedData, error: updateError } = await supabase
            .from("shareholders_new")
            .update({ user_id: userId })
            .eq("id", shareholderId)
            .select()

        if (updateError) {
            console.error("Error linking shareholder:", updateError)
            return NextResponse.json({ error: "Failed to link shareholder" }, { status: 500 })
        }

        if (!updatedData || updatedData.length === 0) {
            console.error("Update returned no data - shareholder may not exist or no rows affected")
            return NextResponse.json({ error: "Failed to update shareholder - no rows affected" }, { status: 500 })
        }

        console.log("Successfully linked shareholder:", shareholderId, "to user:", userId, "Updated data:", updatedData)

        return NextResponse.json({
            success: true,
            message: `Shareholder ${shareholder.first_name} ${shareholder.last_name} linked successfully`,
            shareholder: updatedData[0]
        })
    } catch (err) {
        console.error("API Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * DELETE /api/users/[userId]/shareholders
 * Unlink a shareholder record from this user
 * Query: ?shareholderId=xxx
 */
export async function DELETE(request, { params }) {
    try {
        const { userId } = await params
        const { searchParams } = new URL(request.url)
        const shareholderId = searchParams.get("shareholderId")
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!shareholderId) {
            return NextResponse.json({ error: "shareholderId query param is required" }, { status: 400 })
        }

        // Verify the shareholder is actually linked to this user
        const { data: shareholder, error: fetchError } = await supabase
            .from("shareholders_new")
            .select("id, user_id, first_name, last_name")
            .eq("id", shareholderId)
            .eq("user_id", userId)
            .single()

        if (fetchError || !shareholder) {
            return NextResponse.json({ error: "Shareholder not found or not linked to this user" }, { status: 404 })
        }

        // Unlink shareholder (set user_id to null)
        const { error: updateError } = await supabase
            .from("shareholders_new")
            .update({ user_id: null })
            .eq("id", shareholderId)

        if (updateError) {
            console.error("Error unlinking shareholder:", updateError)
            return NextResponse.json({ error: "Failed to unlink shareholder" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Shareholder ${shareholder.first_name} ${shareholder.last_name} unlinked successfully`
        })
    } catch (err) {
        console.error("API Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
