-- Create audit_logs table
-- Updated to reference correct tables (users_new, issuers_new) and removed RLS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES public.users_new(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    issuer_id UUID REFERENCES public.issuers_new(id),
    ip_address TEXT,
    user_agent TEXT
);

-- Add indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_issuer_id ON public.audit_logs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);

-- Comment on table
COMMENT ON TABLE public.audit_logs IS 'Tracks all critical system actions. References users_new and issuers_new.';
