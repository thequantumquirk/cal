-- Create document_notes table for user personal notes on documents
CREATE TABLE IF NOT EXISTS document_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doc_id, user_id)
);

-- Add RLS policies
ALTER TABLE document_notes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes
CREATE POLICY "Users can view own notes"
    ON document_notes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
    ON document_notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
    ON document_notes
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
    ON document_notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_notes_user_id ON document_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_document_notes_doc_id ON document_notes(doc_id);
