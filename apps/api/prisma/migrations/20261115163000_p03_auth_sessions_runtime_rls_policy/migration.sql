-- The API creates an application session before a per-request user context exists.
-- Keep auth session rows inaccessible to public Supabase roles while allowing the
-- dedicated NestJS runtime role to create, validate, rotate, and revoke sessions.
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_sessions_runtime_all"
ON "auth_sessions"
AS PERMISSIVE
FOR ALL
TO "surat_runtime"
USING (true)
WITH CHECK (true);
