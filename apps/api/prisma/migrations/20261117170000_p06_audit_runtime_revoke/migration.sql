-- Default privileges granted the runtime role UPDATE and DELETE at table creation.
-- The P06 audit table is append-only for the application role.
REVOKE UPDATE, DELETE, TRUNCATE
ON TABLE public.group_policy_audit
FROM surat_runtime;
