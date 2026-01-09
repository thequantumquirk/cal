import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkIssuerWriteAccess } from "@/lib/issuer-utils"

// ⚡ OPTIMIZED: Uses idx_restriction_templates_issuer_created index for fast queries
// Client-side caching via HTTP headers (5 min cache, 10 min stale-while-revalidate)
export async function GET(request) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get('issuerId')

    if (!issuerId) {
      return NextResponse.json({ error: 'Issuer ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // ⚡ FAST: Uses idx_restriction_templates_issuer_created index
    const { data: templates, error } = await supabase
      .from("restrictions_templates_new")
      .select("id, issuer_id, restriction_type, restriction_name, description, is_active, created_at, created_by")
      .eq("issuer_id", issuerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching restriction templates:", error)
      return NextResponse.json(
        { error: "Failed to fetch restriction templates", details: error.message },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ GET /api/restriction-templates - ${templates?.length || 0} records in ${duration}ms`)

    // No caching to ensure fresh data after updates
    return NextResponse.json(templates || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Error in restriction templates API:', error, `(${duration}ms)`)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { issuer_id, restriction_type, restriction_name, description, is_active } = body

    if (!issuer_id || !restriction_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if issuer is suspended
    const writeAccess = await checkIssuerWriteAccess(supabase, issuer_id)
    if (!writeAccess.allowed) {
      return NextResponse.json(
        { error: writeAccess.reason || 'Cannot modify suspended issuer' },
        { status: 403 }
      )
    }

    const { data: template, error } = await supabase
      .from("restrictions_templates_new")
      .insert({
        issuer_id,
        restriction_type,
        restriction_name,
        description,
        is_active: is_active !== undefined ? is_active : true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating restriction template:', error)
      return NextResponse.json({ error: 'Failed to create restriction template' }, { status: 500 })
    }

    return NextResponse.json(template, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error in restriction templates POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, issuer_id, restriction_type, restriction_name, description, is_active } = body

    if (!id || !issuer_id || !restriction_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if issuer is suspended
    const writeAccess = await checkIssuerWriteAccess(supabase, issuer_id)
    if (!writeAccess.allowed) {
      return NextResponse.json(
        { error: writeAccess.reason || 'Cannot modify suspended issuer' },
        { status: 403 }
      )
    }

    // Check if user has permission (superadmin or admin)
    const { data: userData } = await supabase
      .from("users_new")
      .select("is_super_admin")
      .eq("id", user.id)
      .single()

    const isSuperAdmin = userData?.is_super_admin === true

    // If not superadmin, check if they're admin for this issuer
    if (!isSuperAdmin) {
      const { data: issuerUser } = await supabase
        .from("issuer_users_new")
        .select("roles_new!inner(role_name)")
        .eq("user_id", user.id)
        .eq("issuer_id", issuer_id)
        .single()

      const isAdmin = issuerUser?.roles_new?.role_name === "admin"

      if (!isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { data: template, error } = await supabase
      .from("restrictions_templates_new")
      .update({
        restriction_type,
        restriction_name,
        description,
        is_active: is_active !== undefined ? is_active : true,
      })
      .eq("id", id)
      .eq("issuer_id", issuer_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating restriction template:', error)
      return NextResponse.json({ error: 'Failed to update restriction template' }, { status: 500 })
    }

    // Add cache-control headers to prevent caching
    return NextResponse.json(template, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error in restriction templates PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get('issuerId')

    if (!issuerId) {
      return NextResponse.json({ error: 'Issuer ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if issuer is suspended
    const writeAccess = await checkIssuerWriteAccess(supabase, issuerId)
    if (!writeAccess.allowed) {
      return NextResponse.json(
        { error: writeAccess.reason || 'Cannot modify suspended issuer' },
        { status: 403 }
      )
    }

    // Check if user has permission (superadmin or admin)
    const { data: userData } = await supabase
      .from("users_new")
      .select("is_super_admin")
      .eq("id", user.id)
      .single()

    const isSuperAdmin = userData?.is_super_admin === true

    // If not superadmin, check if they're admin for this issuer
    if (!isSuperAdmin) {
      const { data: issuerUser } = await supabase
        .from("issuer_users_new")
        .select("roles_new!inner(role_name)")
        .eq("user_id", user.id)
        .eq("issuer_id", issuerId)
        .single()

      const isAdmin = issuerUser?.roles_new?.role_name === "admin"

      if (!isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Delete all restriction templates for this issuer
    const { error } = await supabase
      .from("restrictions_templates_new")
      .delete()
      .eq("issuer_id", issuerId)

    if (error) {
      console.error('Error deleting restriction templates:', error)
      return NextResponse.json({ error: 'Failed to delete restriction templates' }, { status: 500 })
    }

    console.log(`✅ Deleted all restriction templates for issuer ${issuerId}`)
    return NextResponse.json({ success: true, message: 'All restriction templates deleted' })
  } catch (error) {
    console.error('Error in restriction templates DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
