import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";

// GET - Fetch documents for a request
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("transfer_request_documents")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch user data for uploaded_by and reviewed_by
    const enrichedData = await Promise.all(
      (data || []).map(async (doc) => {
        const [uploadedByData, reviewedByData] = await Promise.all([
          doc.uploaded_by ? supabase.from("users_new").select("id, name, email").eq("id", doc.uploaded_by).single() : Promise.resolve({ data: null }),
          doc.reviewed_by ? supabase.from("users_new").select("id, name, email").eq("id", doc.reviewed_by).single() : Promise.resolve({ data: null })
        ]);

        return {
          ...doc,
          uploaded_by_user: uploadedByData.data,
          reviewed_by_user: reviewedByData.data
        };
      })
    );

    return NextResponse.json(enrichedData, { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Upload document to request
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      requestId,
      documentType,
      documentName,
      fileUrl,
      fileSize,
      fileType,
      isRequired
    } = body;

    if (!requestId || !documentType || !documentName || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to this request
    const { data: transferRequest, error: fetchError } = await supabase
      .from("transfer_agent_requests")
      .select("broker_id")
      .eq("id", requestId)
      .single();

    if (fetchError) throw fetchError;

    const userRole = await getCurrentUserRole();

    if (userRole === "broker" && transferRequest.broker_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert document
    const { data: newDoc, error: insertError } = await supabase
      .from("transfer_request_documents")
      .insert({
        request_id: requestId,
        document_type: documentType,
        document_name: documentName,
        file_url: fileUrl,
        file_size: fileSize,
        file_type: fileType,
        is_required: isRequired || false,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newDoc, { status: 201 });
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH - Mark document as reviewed (admin only)
export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "admin" && userRole !== "superadmin" && userRole !== "transfer_team") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { documentId, isReviewed } = body;

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const updateData = {
      is_reviewed: isReviewed
    };

    if (isReviewed) {
      updateData.reviewed_by = user.id;
      updateData.reviewed_at = new Date().toISOString();
    } else {
      updateData.reviewed_by = null;
      updateData.reviewed_at = null;
    }

    const { data, error } = await supabase
      .from("transfer_request_documents")
      .update(updateData)
      .eq("id", documentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Remove document
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Verify ownership
    const { data: doc, error: fetchError } = await supabase
      .from("transfer_request_documents")
      .select("uploaded_by, request_id")
      .eq("id", documentId)
      .single();

    if (fetchError) throw fetchError;

    const userRole = await getCurrentUserRole();

    if (userRole === "broker" && doc.uploaded_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("transfer_request_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
