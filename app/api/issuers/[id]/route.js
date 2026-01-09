import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkIssuerWriteAccess, checkIsSuperAdmin } from "@/lib/issuer-utils"

// ⚡ GET method with response time logging
export async function GET(request, { params }) {
  const startTime = Date.now()
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: issuer, error } = await supabase
      .from("issuers_new")
      .select("*")
      .eq("id", id)
      .single()

    const duration = Date.now() - startTime
    console.log(`⏱️ GET /api/issuers/${id} took ${duration}ms`)

    if (error) {
      console.error('Error fetching issuer:', error)
      return NextResponse.json({ error: 'Failed to fetch issuer' }, { status: 500 })
    }

    if (!issuer) {
      return NextResponse.json({ error: 'Issuer not found' }, { status: 404 })
    }

    return NextResponse.json(issuer, {
      headers: {
        // Smart caching: 60s cache, must-revalidate on refresh, serve stale while fetching fresh
        'Cache-Control': 'private, max-age=60, must-revalidate, stale-while-revalidate=30',
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Error in issuer GET API:', error, `(${duration}ms)`)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT method with suspended issuer check
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user.id)

    // Check if issuer is suspended (only super admins can update suspended issuers)
    const writeAccess = await checkIssuerWriteAccess(supabase, id)
    if (!writeAccess.allowed && !isSuperAdmin) {
      return NextResponse.json(
        { error: writeAccess.reason || 'Cannot modify suspended issuer' },
        { status: 403 }
      )
    }

    // Non-super admins cannot change the status field
    if (!isSuperAdmin && body.status !== undefined) {
      delete body.status
    }

    // Update issuer
    const { data: issuer, error } = await supabase
      .from("issuers_new")
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error('Error updating issuer:', error)
      return NextResponse.json({ error: 'Failed to update issuer' }, { status: 500 })
    }

    return NextResponse.json(issuer)
  } catch (error) {
    console.error('Error in issuer PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH method specifically for split ratio updates (with suspended check)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if issuer is suspended
    const writeAccess = await checkIssuerWriteAccess(supabase, id)
    if (!writeAccess.allowed) {
      return NextResponse.json(
        { error: writeAccess.reason || 'Cannot modify suspended issuer' },
        { status: 403 }
      )
    }

    // Extract only the fields we want to update via PATCH
    const { separation_ratio, split_security_type } = body

    // Check if issuer exists
    const { data: existingIssuer, error: findError } = await supabase
      .from("issuers_new")
      .select("id")
      .eq("id", id)
      .single()

    if (findError || !existingIssuer) {
      console.error("Find error:", findError)
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    // Update only specific fields (more targeted than PUT)
    const { data: updatedIssuer, error: updateError } = await supabase
      .from("issuers_new")
      .update({
        separation_ratio,
        split_security_type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      issuer: updatedIssuer
    })
  } catch (err) {
    console.error("Error in issuer PATCH API:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE method for issuer deletion with cascade (with suspended check)
export async function DELETE(request, { params }) {
  const startTime = Date.now()
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is super admin (only super admins can delete issuers)
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user.id)
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can delete issuers" },
        { status: 403 }
      )
    }

    // Check if issuer exists
    const { data: existingIssuer, error: findError } = await supabase
      .from("issuers_new")
      .select("id, display_name")
      .eq("id", id)
      .single()

    if (findError || !existingIssuer) {
      console.error("Issuer not found:", findError)
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    // Manually delete related records in order (child to parent)
    // This ensures foreign key constraints are satisfied

    const deletionLog = {
      issuer: existingIssuer.display_name,
      deleted: {}
    }

    // 1. Delete transfers (main transaction table - references shareholders and securities)
    const { error: transferError, count: transferCount } = await supabase
      .from("transfers_new")
      .delete()
      .eq("issuer_id", id)

    if (transferError) {
      console.error("Error deleting transfers:", transferError)
      return NextResponse.json({
        error: "Failed to delete related transfers/transactions",
        details: transferError.message
      }, { status: 500 })
    }
    deletionLog.deleted.transfers = transferCount || 0

    // 1b. Also delete from prototype table if any exist (legacy data)
    const { error: txPrototypeError, count: txPrototypeCount } = await supabase
      .from("recordkeeping_transactions_prototype")
      .delete()
      .eq("issuer_id", id)

    if (txPrototypeError) {
      console.error("Error deleting prototype transactions:", txPrototypeError)
      // Don't fail - this table might not have data
    }
    deletionLog.deleted.transactionsPrototype = txPrototypeCount || 0

    // 2. Delete shareholder positions (references shareholders and securities)
    const { error: posError, count: posCount } = await supabase
      .from("shareholder_positions_new")
      .delete()
      .eq("issuer_id", id)

    if (posError) {
      console.error("Error deleting positions:", posError)
      // Continue even if this fails (table might not exist or be empty)
    }
    deletionLog.deleted.positions = posCount || 0

    // 3. Delete recordkeeping summary
    const { error: rkError, count: rkCount } = await supabase
      .from("recordkeeping_summary_new")
      .delete()
      .eq("issuer_id", id)

    if (rkError) {
      console.error("Error deleting recordkeeping summary:", rkError)
      return NextResponse.json({
        error: "Failed to delete recordkeeping summary",
        details: rkError.message
      }, { status: 500 })
    }
    deletionLog.deleted.recordkeeping = rkCount || 0

    // 3b. Delete transaction restrictions (MUST happen before shareholders!)
    // This table has FK to shareholders_new, so delete it first
    const { error: restrictError, count: restrictCount } = await supabase
      .from("transaction_restrictions_new")
      .delete()
      .eq("issuer_id", id)

    if (restrictError) {
      console.error("Error deleting transaction restrictions:", restrictError)
      return NextResponse.json({
        error: "Failed to delete transaction restrictions",
        details: restrictError.message
      }, { status: 500 })
    }
    deletionLog.deleted.restrictions = restrictCount || 0

    // 3c. Delete restriction templates (issuer-specific templates)
    const { error: templatesError, count: templatesCount } = await supabase
      .from("restrictions_templates_new")
      .delete()
      .eq("issuer_id", id)

    if (templatesError) {
      console.error("Error deleting restriction templates:", templatesError)
      // Continue even if this fails - templates might be shared
    }
    deletionLog.deleted.restrictionTemplates = templatesCount || 0

    // 4. Delete shareholders
    const { error: shError, count: shCount } = await supabase
      .from("shareholders_new")
      .delete()
      .eq("issuer_id", id)

    if (shError) {
      console.error("Error deleting shareholders:", shError)
      return NextResponse.json({
        error: "Failed to delete shareholders",
        details: shError.message
      }, { status: 500 })
    }
    deletionLog.deleted.shareholders = shCount || 0

    // 5. Delete securities
    const { error: secError, count: secCount } = await supabase
      .from("securities_new")
      .delete()
      .eq("issuer_id", id)

    if (secError) {
      console.error("Error deleting securities:", secError)
      return NextResponse.json({
        error: "Failed to delete securities",
        details: secError.message
      }, { status: 500 })
    }
    deletionLog.deleted.securities = secCount || 0

    // 6. Delete officers
    const { error: offError, count: offCount } = await supabase
      .from("officers_new")
      .delete()
      .eq("issuer_id", id)

    if (offError) {
      console.error("Error deleting officers:", offError)
      return NextResponse.json({
        error: "Failed to delete officers",
        details: offError.message
      }, { status: 500 })
    }
    deletionLog.deleted.officers = offCount || 0

    // 7. Delete split events
    const { error: splitError, count: splitCount } = await supabase
      .from("split_events")
      .delete()
      .eq("issuer_id", id)

    if (splitError) {
      console.error("Error deleting split events:", splitError)
      // Continue even if this fails
    }
    deletionLog.deleted.splits = splitCount || 0

    // 8. Delete documents
    const { error: docError, count: docCount } = await supabase
      .from("documents")
      .delete()
      .eq("issuer_id", id)

    if (docError) {
      console.error("Error deleting documents:", docError)
      // Continue even if this fails
    }
    deletionLog.deleted.documents = docCount || 0

    // 9. Finally, delete the issuer itself
    const { error: deleteError } = await supabase
      .from("issuers_new")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Delete issuer error:", deleteError)
      return NextResponse.json({
        error: "Failed to delete issuer",
        details: deleteError.message
      }, { status: 500 })
    }

    const duration = Date.now() - startTime
    console.log(`⏱️ DELETE /api/issuers/${id} cascade delete completed in ${duration}ms`)
    console.log('Deletion summary:', deletionLog)

    return NextResponse.json({
      success: true,
      message: `Issuer "${existingIssuer.display_name}" and all related data deleted successfully`,
      deletionLog
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Error in issuer DELETE API:', error, `(${duration}ms)`)
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 })
  }
}