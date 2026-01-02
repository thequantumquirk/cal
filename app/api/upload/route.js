import { createClient } from "@/lib/supabase/server"
import { getCurrentUserRole } from "@/lib/actions"
import { uploadToWasabi, WASABI_BUCKETS } from "@/lib/wasabi/client"
import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const issuerId = formData.get('issuerId')
    const documentType = formData.get('documentType')

    if (!file || !issuerId || !documentType) {
      return NextResponse.json({ error: 'File, issuer ID, and document type are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user and session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error in upload:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role using the existing helper function
    const userRole = await getCurrentUserRole()

    console.log('User role:', userRole, 'for user:', user.id)

    // Allow superadmins, admins, and brokers to upload
    const canUpload = userRole === 'superadmin' || userRole === 'broker' || userRole === 'admin'

    if (!canUpload) {
      // For other users, verify they have access to this issuer
      const { data: userAccess, error: accessError } = await supabase
        .from('issuer_users_new')
        .select('id')
        .eq('user_id', user.id)
        .eq('issuer_id', issuerId)
        .maybeSingle()

      if (accessError) {
        console.error('User access error:', accessError)
        return NextResponse.json({ error: 'Database error checking access' }, { status: 500 })
      }

      if (!userAccess) {
        console.error('User access denied: No relationship found for user', user.id, 'and issuer', issuerId)
        return NextResponse.json({ error: 'Access denied to this issuer' }, { status: 403 })
      }
    }

    console.log('Upload request from user:', user.id, 'for issuer:', issuerId)

    // Create a unique file name
    const timestamp = new Date().getTime()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileKey = `${issuerId}/${documentType}/${timestamp}_${sanitizedFileName}`

    console.log('Attempting to upload file:', fileKey, 'Size:', file.size)

    try {
      // Convert file to buffer for Wasabi upload
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Wasabi Storage
      const publicUrl = await uploadToWasabi(
        WASABI_BUCKETS.DOCUMENTS,
        fileKey,
        buffer,
        file.type
      )

      console.log('File uploaded successfully to Wasabi:', fileKey)

      return NextResponse.json({
        success: true,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: fileKey
      })
    } catch (uploadError) {
      console.error('Error uploading file to Wasabi:', uploadError)

      return NextResponse.json({
        error: 'Failed to upload file',
        details: uploadError.message || 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in upload API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
