BEGIN;

-- The database's default privileges include UPDATE/DELETE for surat_runtime.
-- Organization history is append-only for the application role.
REVOKE UPDATE, DELETE, TRUNCATE
ON TABLE public.organization_changes
FROM surat_runtime;

COMMIT;
