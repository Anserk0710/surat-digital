-- Run once as the current owner/superuser after surat_migrator exists.
-- This file intentionally contains no passwords and is safe to run again.

DO $role_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'surat_migrator'
  ) THEN
    RAISE EXCEPTION 'PostgreSQL role surat_migrator does not exist.';
  END IF;
END
$role_guard$;

GRANT "surat_migrator" TO current_user;

-- Runtime must not inherit CREATE through PUBLIC.
REVOKE CREATE
  ON SCHEMA public
  FROM PUBLIC;

GRANT USAGE, CREATE
  ON SCHEMA public
  TO "surat_migrator";

GRANT USAGE
  ON SCHEMA public
  TO "surat_runtime";

REVOKE CREATE
  ON SCHEMA public
  FROM "surat_runtime";

DO $ownership$
DECLARE
  relation RECORD;
BEGIN
  FOR relation IN
    SELECT
      namespace.nspname AS schema_name,
      class.relname AS relation_name,
      class.relkind AS relation_kind
    FROM pg_class AS class
    JOIN pg_namespace AS namespace
      ON namespace.oid = class.relnamespace
    LEFT JOIN pg_depend AS dependency
      ON dependency.objid = class.oid
      AND dependency.deptype = 'e'
    WHERE namespace.nspname = 'public'
      AND class.relkind IN ('r', 'p', 'S')
      AND dependency.objid IS NULL
      AND pg_get_userbyid(class.relowner) <> 'surat_migrator'
  LOOP
    IF relation.relation_kind = 'S' THEN
      EXECUTE format(
        'ALTER SEQUENCE %I.%I OWNER TO %I',
        relation.schema_name,
        relation.relation_name,
        'surat_migrator'
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE %I.%I OWNER TO %I',
        relation.schema_name,
        relation.relation_name,
        'surat_migrator'
      );
    END IF;
  END LOOP;
END
$ownership$;

GRANT
  SELECT,
  INSERT,
  UPDATE,
  DELETE
ON ALL TABLES
IN SCHEMA public
TO "surat_runtime";

GRANT
  USAGE,
  SELECT
ON ALL SEQUENCES
IN SCHEMA public
TO "surat_runtime";

-- Browser-facing Supabase Data API roles must never bypass the NestJS API for
-- application data. Keep this explicit so unrelated objects in public are not
-- affected by the ownership handoff.
REVOKE ALL ON TABLE
  public."companies",
  public."offices",
  public."divisions",
  public."office_divisions",
  public."job_titles",
  public."employees",
  public."employee_assignments",
  public."groups",
  public."permissions",
  public."employee_groups",
  public."group_permissions",
  public."auth_sessions"
FROM anon, authenticated;

-- Every relation created by surat_migrator automatically receives
-- the minimum DML privileges required by the runtime application.
ALTER DEFAULT PRIVILEGES
FOR ROLE "surat_migrator"
IN SCHEMA public
GRANT
  SELECT,
  INSERT,
  UPDATE,
  DELETE
ON TABLES
TO "surat_runtime";

ALTER DEFAULT PRIVILEGES
FOR ROLE "surat_migrator"
IN SCHEMA public
GRANT
  USAGE,
  SELECT
ON SEQUENCES
TO "surat_runtime";

ALTER DEFAULT PRIVILEGES
FOR ROLE "surat_migrator"
IN SCHEMA public
REVOKE ALL
ON TABLES
FROM anon, authenticated;
