-- ============================================================
-- SECURITY AUDIT AND MONITORING INFRASTRUCTURE
-- For UK GDPR compliance and production incident detection
-- ============================================================

-- Security Events Table for real-time security monitoring
CREATE TABLE public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address_hash TEXT, -- Hashed for GDPR compliance
    user_agent_hash TEXT, -- Hashed for GDPR compliance
    endpoint TEXT,
    correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log Table for comprehensive access tracking
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ip_address_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate Limit Tracking Table for brute-force detection
CREATE TABLE public.rate_limit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier_hash TEXT NOT NULL, -- Hashed IP or user ID
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    blocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data Access Logs for GDPR compliance
CREATE TABLE public.data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accessed_table TEXT NOT NULL,
    accessed_record_id UUID,
    access_type TEXT NOT NULL CHECK (access_type IN ('read', 'bulk_read', 'export', 'delete')),
    record_count INTEGER DEFAULT 1,
    correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all security tables
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read security events (for dashboard access)
CREATE POLICY "Admins can view security events"
ON public.security_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert security events (from edge functions)
CREATE POLICY "Service can insert security events"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service can insert audit logs
CREATE POLICY "Service can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can view rate limit events
CREATE POLICY "Admins can view rate limit events"
ON public.rate_limit_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service can insert/update rate limit events
CREATE POLICY "Service can insert rate limit events"
ON public.rate_limit_events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service can update rate limit events"
ON public.rate_limit_events FOR UPDATE
TO authenticated
USING (true);

-- Only admins can view data access logs
CREATE POLICY "Admins can view data access logs"
ON public.data_access_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service can insert data access logs
CREATE POLICY "Service can insert data access logs"
ON public.data_access_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_user ON public.security_events(user_id);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_correlation ON public.security_events(correlation_id);

CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE INDEX idx_rate_limit_identifier ON public.rate_limit_events(identifier_hash, endpoint);
CREATE INDEX idx_rate_limit_window ON public.rate_limit_events(window_start);

CREATE INDEX idx_data_access_accessor ON public.data_access_logs(accessor_id);
CREATE INDEX idx_data_access_table ON public.data_access_logs(accessed_table);
CREATE INDEX idx_data_access_created ON public.data_access_logs(created_at DESC);

-- Function to log security events (for use in edge functions and triggers)
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type TEXT,
    p_severity TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address_hash TEXT DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_correlation_id UUID;
BEGIN
    v_correlation_id := gen_random_uuid();
    
    INSERT INTO public.security_events (
        event_type, severity, user_id, ip_address_hash, 
        endpoint, correlation_id, event_data
    ) VALUES (
        p_event_type, p_severity, p_user_id, p_ip_address_hash,
        p_endpoint, v_correlation_id, p_event_data
    );
    
    RETURN v_correlation_id;
END;
$$;

-- Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier_hash TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Count requests in current window
    SELECT COALESCE(SUM(request_count), 0) INTO v_request_count
    FROM public.rate_limit_events
    WHERE identifier_hash = p_identifier_hash
      AND endpoint = p_endpoint
      AND window_start > v_window_start;
    
    -- Log this request
    INSERT INTO public.rate_limit_events (identifier_hash, endpoint, request_count, window_start)
    VALUES (p_identifier_hash, p_endpoint, 1, now());
    
    -- Return true if rate limit exceeded
    IF v_request_count >= p_max_requests THEN
        -- Log the rate limit violation
        PERFORM public.log_security_event(
            'rate_limit_exceeded',
            'warning',
            NULL,
            p_identifier_hash,
            p_endpoint,
            jsonb_build_object('request_count', v_request_count, 'limit', p_max_requests)
        );
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Cleanup old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.rate_limit_events
    WHERE window_start < now() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- Retention policy: Keep security events for 90 days (GDPR compliance)
-- This should be run via a scheduled job
CREATE OR REPLACE FUNCTION public.apply_security_log_retention()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER := 0;
    v_temp INTEGER;
BEGIN
    -- Delete security events older than 90 days
    DELETE FROM public.security_events
    WHERE created_at < now() - INTERVAL '90 days';
    GET DIAGNOSTICS v_temp = ROW_COUNT;
    v_deleted := v_deleted + v_temp;
    
    -- Delete audit logs older than 2 years (GDPR max for some data)
    DELETE FROM public.audit_logs
    WHERE created_at < now() - INTERVAL '2 years';
    GET DIAGNOSTICS v_temp = ROW_COUNT;
    v_deleted := v_deleted + v_temp;
    
    -- Delete data access logs older than 90 days
    DELETE FROM public.data_access_logs
    WHERE created_at < now() - INTERVAL '90 days';
    GET DIAGNOSTICS v_temp = ROW_COUNT;
    v_deleted := v_deleted + v_temp;
    
    RETURN v_deleted;
END;
$$;