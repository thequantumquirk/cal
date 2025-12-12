import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * PATCH /api/shareholders/[id]
 * Update a shareholder record (email, etc.)
 */
export async function PATCH(request, { params }) {
    try {
        const { id } = await params
        const body = await request.json()
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only allow updating specific fields
        const allowedFields = ["email", "first_name", "last_name", "address", "phone"]
        const updateData = {}

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
        }

        // AUTO-LINKING LOGIC: If email is being updated, try to link/unlink user
        if (updateData.email !== undefined) {
            const email = updateData.email

            if (email) {
                // Check if a user exists with this email
                const { data: existingUser } = await supabase
                    .from("users_new")
                    .select("id")
                    .eq("email", email)
                    .single()

                if (existingUser) {
                    updateData.user_id = existingUser.id
                } else {
                    // If no user found with this email, unlink (since email changed)
                    updateData.user_id = null
                }
            } else {
                // If email is removed, unlink
                updateData.user_id = null
            }
        }

        const { data, error } = await supabase
            .from("shareholders_new")
            .update(updateData)
            .eq("id", id)
            .select(`
        *,
        issuers_new:issuer_id (
          id,
          issuer_name,
          display_name
        )
      `)
            .single()

        if (error) {
            console.error("Error updating shareholder:", error)
            return NextResponse.json({ error: "Failed to update shareholder" }, { status: 500 })
        }

        return NextResponse.json({ success: true, shareholder: data })
    } catch (err) {
        console.error("API Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * GET /api/shareholders/[id]
 * Get a single shareholder by ID
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data, error } = await supabase
            .from("shareholders_new")
            .select(`
        *,
        issuers_new:issuer_id (
          id,
          issuer_name,
          display_name
        )
      `)
            .eq("id", id)
            .single()

        if (error) {
            console.error("Error fetching shareholder:", error)
            return NextResponse.json({ error: "Shareholder not found" }, { status: 404 })
        }

        return NextResponse.json({ shareholder: data })
    } catch (err) {
        console.error("API Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
