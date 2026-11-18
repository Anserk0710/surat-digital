-- P06 — Group Policy integrity and audit
-- Execute via surat_migrator, never via the runtime role.

-- ============================================================
-- 1. Group company ownership is immutable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.p06_group_company_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'P06_GROUP_COMPANY_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p06_group_company_immutable
BEFORE UPDATE OF company_id
ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.p06_group_company_guard();

-- ============================================================
-- 2. Membership must remain inside one company.
-- ============================================================

CREATE OR REPLACE FUNCTION public.p06_membership_tenant_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  employee_company UUID;
  group_company UUID;
BEGIN
  SELECT company_id
  INTO employee_company
  FROM public.employees
  WHERE id = NEW.employee_id
  FOR KEY SHARE;

  SELECT company_id
  INTO group_company
  FROM public.groups
  WHERE id = NEW.group_id
  FOR KEY SHARE;

  IF employee_company IS NULL
     OR group_company IS NULL
     OR employee_company <> group_company
  THEN
    RAISE EXCEPTION 'P06_CROSS_COMPANY_MEMBERSHIP'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p06_membership_tenant_integrity
BEFORE INSERT OR UPDATE OF employee_id, group_id
ON public.employee_groups
FOR EACH ROW
EXECUTE FUNCTION public.p06_membership_tenant_guard();

-- ============================================================
-- 3. Immutable policy audit table.
-- ============================================================

CREATE TABLE public.group_policy_audit (
  id UUID NOT NULL,
  company_id UUID NOT NULL,
  actor_employee_id UUID NOT NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT group_policy_audit_pkey PRIMARY KEY (id)
);

CREATE INDEX group_policy_audit_company_time_idx
ON public.group_policy_audit(company_id, occurred_at);

REVOKE ALL
ON TABLE public.group_policy_audit
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.group_policy_audit
TO surat_runtime;

ALTER TABLE public.group_policy_audit
ENABLE ROW LEVEL SECURITY;

CREATE POLICY group_policy_audit_runtime_insert
ON public.group_policy_audit
FOR INSERT
TO surat_runtime
WITH CHECK (true);

CREATE POLICY group_policy_audit_runtime_select
ON public.group_policy_audit
FOR SELECT
TO surat_runtime
USING (true);

-- No UPDATE/DELETE permissions or policies for the runtime role.
-- Historical audit rows can be inspected using authorized
-- migration/audit-operations credentials only.
