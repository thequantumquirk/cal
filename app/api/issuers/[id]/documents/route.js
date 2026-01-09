import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch issuer documents from database with document type info
    const { data: documents, error } = await supabase
      .from("issuer_documents")
      .select(`
        id,
        title,
        filing_date,
        url,
        notes,
        document_types!inner (
          code,
          name,
          display_order
        )
      `)
      .eq("issuer_id", id)
      .order("document_types(display_order)", { ascending: true })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ documents: [] })
    }

    // Transform to match expected format
    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      type: doc.document_types.code,
      title: doc.title,
      filing_date: doc.filing_date,
      url: doc.url,
      notes: doc.notes
    }))

    return NextResponse.json({ documents: formattedDocs })
  } catch (error) {
    console.error('Error in documents API:', error)
    return NextResponse.json({
      documents: [],
      error: 'Internal server error'
    }, { status: 500 })
  }
}
