-- P07 — RLS runtime POC
-- Runtime role bukan owner relation dan wajib tanpa BYPASSRLS.

CREATE TABLE public.rls_poc_resources (
  id UUID NOT NULL,
  owner_employee_id UUID NOT NULL,
  office_id UUID NOT NULL,
  label VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT rls_poc_resources_pkey
    PRIMARY KEY (id),

  CONSTRAINT rls_poc_resources_owner_employee_id_fkey
    FOREIGN KEY (owner_employee_id)
    REFERENCES public.employees(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT rls_poc_resources_office_id_fkey
    FOREIGN KEY (office_id)
    REFERENCES public.offices(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX rls_poc_resources_owner_employee_id_idx
  ON public.rls_poc_resources(owner_employee_id);

CREATE INDEX rls_poc_resources_office_id_idx
  ON public.rls_poc_resources(office_id);

-- Browser/Data API tidak boleh mengakses probe.
REVOKE ALL
ON TABLE public.rls_poc_resources
FROM PUBLIC, anon, authenticated;

-- Default privileges P02 memberi runtime DML.
-- P07 probe dibuat read-only untuk application runtime.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON TABLE public.rls_poc_resources
FROM surat_runtime;

GRANT SELECT
ON TABLE public.rls_poc_resources
TO surat_runtime;

ALTER TABLE public.rls_poc_resources
ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_poc_resource_select
ON public.rls_poc_resources
FOR SELECT
TO surat_runtime
USING (
  -- Row harus milik employee yang sedang aktif.
  rls_poc_resources.owner_employee_id =
    NULLIF(
      current_setting('app.employee_id', true),
      ''
    )::uuid

  -- Row harus berada pada primary office request.
  AND rls_poc_resources.office_id =
    NULLIF(
      current_setting('app.office_id', true),
      ''
    )::uuid

  -- auth_user_id tidak boleh berasal dari request body.
  -- Harus cocok dengan authenticated Supabase identity.
  AND EXISTS (
    SELECT 1
    FROM public.employees AS employee
    JOIN public.companies AS company
      ON company.id = employee.company_id
    WHERE employee.id =
      rls_poc_resources.owner_employee_id
      AND employee.company_id =
        NULLIF(
          current_setting('app.company_id', true),
          ''
        )::uuid
      AND employee.auth_user_id =
        NULLIF(
          current_setting(
            'request.jwt.claim.sub',
            true
          ),
          ''
        )::uuid
      AND employee.status = 'ACTIVE'
      AND company.active = true
  )

  -- Employee juga harus benar-benar mempunyai
  -- primary assignment aktif ke office tersebut.
  AND EXISTS (
    SELECT 1
    FROM public.employee_assignments AS assignment
    JOIN public.office_divisions AS office_division
      ON office_division.id =
        assignment.office_division_id
    JOIN public.offices AS office
      ON office.id =
        office_division.office_id
    WHERE assignment.employee_id =
      rls_poc_resources.owner_employee_id
      AND assignment.active = true
      AND assignment.is_primary = true
      AND (
        assignment.valid_from IS NULL
        OR assignment.valid_from <= CURRENT_DATE
      )
      AND (
        assignment.valid_until IS NULL
        OR assignment.valid_until >= CURRENT_DATE
      )
      AND office_division.active = true
      AND office.id =
        rls_poc_resources.office_id
      AND office.active = true
      AND office.company_id =
        NULLIF(
          current_setting('app.company_id', true),
          ''
        )::uuid
  )
);