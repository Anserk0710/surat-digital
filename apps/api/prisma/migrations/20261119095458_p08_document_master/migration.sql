-- ============================================================
-- P08 — Document Master
-- ============================================================

CREATE TYPE "DocumentStatus" AS ENUM (
  'DRAFT',
  'PENDING_ACKNOWLEDGMENT',
  'PENDING_APPROVAL',
  'IN_PROGRESS',
  'FINALIZING',
  'REJECTED',
  'CANCELLED',
  'ISSUED',
  'ARCHIVED'
);

CREATE TABLE public.document_types (
  id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT document_types_pkey
    PRIMARY KEY (id),

  CONSTRAINT document_types_code_key
    UNIQUE (code)
);

CREATE TABLE public.document_subtypes (
  id UUID NOT NULL,
  document_type_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT document_subtypes_pkey
    PRIMARY KEY (id),

  CONSTRAINT document_subtypes_document_type_id_fkey
    FOREIGN KEY (document_type_id)
    REFERENCES public.document_types(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT document_subtypes_document_type_id_code_key
    UNIQUE (document_type_id, code),

  CONSTRAINT document_subtypes_id_document_type_id_key
    UNIQUE (id, document_type_id)
);

CREATE INDEX document_subtypes_document_type_id_idx
  ON public.document_subtypes(document_type_id);

CREATE TABLE public.documents (
  id UUID NOT NULL,
  company_id UUID NOT NULL,
  document_type_id UUID NOT NULL,
  document_subtype_id UUID NOT NULL,
  creator_employee_id UUID NOT NULL,
  issuer_division_id UUID NOT NULL,
  issuer_office_id UUID NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  revision INTEGER NOT NULL DEFAULT 1,

  submitted_at TIMESTAMPTZ(6),
  issued_at TIMESTAMPTZ(6),
  rejected_at TIMESTAMPTZ(6),
  cancelled_at TIMESTAMPTZ(6),
  archived_at TIMESTAMPTZ(6),

  rejection_reason TEXT,
  withdraw_reason TEXT,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT documents_pkey
    PRIMARY KEY (id),

  CONSTRAINT documents_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_document_type_id_fkey
    FOREIGN KEY (document_type_id)
    REFERENCES public.document_types(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_document_subtype_type_fkey
    FOREIGN KEY (
      document_subtype_id,
      document_type_id
    )
    REFERENCES public.document_subtypes(
      id,
      document_type_id
    )
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_creator_employee_id_fkey
    FOREIGN KEY (creator_employee_id)
    REFERENCES public.employees(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_issuer_office_id_fkey
    FOREIGN KEY (issuer_office_id)
    REFERENCES public.offices(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_issuer_division_id_fkey
    FOREIGN KEY (issuer_division_id)
    REFERENCES public.divisions(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_issuer_scope_fkey
    FOREIGN KEY (
      issuer_office_id,
      issuer_division_id
    )
    REFERENCES public.office_divisions(
      office_id,
      division_id
    )
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT documents_revision_check
    CHECK (revision >= 1),

  CONSTRAINT documents_title_not_blank_check
    CHECK (length(trim(title)) > 0)
);

CREATE INDEX documents_company_id_status_created_at_idx
  ON public.documents(company_id, status, created_at);

CREATE INDEX documents_creator_status_created_at_idx
  ON public.documents(
    creator_employee_id,
    status,
    created_at
  );

CREATE INDEX documents_type_subtype_idx
  ON public.documents(
    document_type_id,
    document_subtype_id
  );

CREATE INDEX documents_issuer_scope_idx
  ON public.documents(
    issuer_office_id,
    issuer_division_id
  );

-- ============================================================
-- Direct API / runtime privileges
-- ============================================================

REVOKE ALL
ON TABLE
  public.document_types,
  public.document_subtypes,
  public.documents
FROM PUBLIC, anon, authenticated;

-- Master hanya read-only dari application runtime.
REVOKE ALL
ON TABLE
  public.document_types,
  public.document_subtypes
FROM surat_runtime;

GRANT SELECT
ON TABLE
  public.document_types,
  public.document_subtypes
TO surat_runtime;

-- Documents tidak mendukung DELETE pada P08.
REVOKE ALL
ON TABLE public.documents
FROM surat_runtime;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.documents
TO surat_runtime;

-- ============================================================
-- Effective Group Policy helper for RLS
--
-- SECURITY INVOKER:
-- function tetap menggunakan privilege caller, bukan privilege owner.
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_has_effective_permission(
  _permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.group_permissions AS group_permission

      JOIN public.permissions AS permission
        ON permission.id =
          group_permission.permission_id

      JOIN public.groups AS policy_group
        ON policy_group.id =
          group_permission.group_id

      JOIN public.employee_groups AS membership
        ON membership.group_id =
          policy_group.id

      JOIN public.employees AS employee
        ON employee.id =
          membership.employee_id

      JOIN public.companies AS company
        ON company.id =
          employee.company_id

      WHERE employee.id =
        NULLIF(
          current_setting(
            'app.employee_id',
            true
          ),
          ''
        )::uuid

        AND employee.company_id =
          NULLIF(
            current_setting(
              'app.company_id',
              true
            ),
            ''
          )::uuid

        AND employee.status = 'ACTIVE'
        AND company.active = true

        AND membership.active = true

        AND policy_group.active = true
        AND policy_group.company_id =
          employee.company_id

        AND group_permission.active = true
        AND group_permission.effect = 'ALLOW'

        AND permission.active = true
        AND permission.code =
          _permission_code
    )

    AND NOT EXISTS (
      SELECT 1
      FROM public.group_permissions AS group_permission

      JOIN public.permissions AS permission
        ON permission.id =
          group_permission.permission_id

      JOIN public.groups AS policy_group
        ON policy_group.id =
          group_permission.group_id

      JOIN public.employee_groups AS membership
        ON membership.group_id =
          policy_group.id

      JOIN public.employees AS employee
        ON employee.id =
          membership.employee_id

      JOIN public.companies AS company
        ON company.id =
          employee.company_id

      WHERE employee.id =
        NULLIF(
          current_setting(
            'app.employee_id',
            true
          ),
          ''
        )::uuid

        AND employee.company_id =
          NULLIF(
            current_setting(
              'app.company_id',
              true
            ),
            ''
          )::uuid

        AND employee.status = 'ACTIVE'
        AND company.active = true

        AND membership.active = true

        AND policy_group.active = true
        AND policy_group.company_id =
          employee.company_id

        AND group_permission.active = true
        AND group_permission.effect = 'DENY'

        AND permission.active = true
        AND permission.code =
          _permission_code
    );
$$;

REVOKE ALL
ON FUNCTION public.app_has_effective_permission(TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.app_has_effective_permission(TEXT)
TO surat_runtime;

-- ============================================================
-- Document RLS
-- ============================================================

ALTER TABLE public.documents
ENABLE ROW LEVEL SECURITY;

-- Creator selalu boleh melihat dokumen miliknya.
-- Document.ViewAll memperluas scope ke seluruh company.
CREATE POLICY documents_select_policy
ON public.documents
FOR SELECT
TO surat_runtime
USING (
  company_id =
    NULLIF(
      current_setting(
        'app.company_id',
        true
      ),
      ''
    )::uuid

  AND (
    creator_employee_id =
      NULLIF(
        current_setting(
          'app.employee_id',
          true
        ),
        ''
      )::uuid

    OR public.app_has_effective_permission(
      'Document.ViewAll'
    )
  )
);

-- Document.Create + creator identity + tenant +
-- active assignment ke issuer OfficeDivision.
CREATE POLICY documents_insert_policy
ON public.documents
FOR INSERT
TO surat_runtime
WITH CHECK (
  status = 'DRAFT'

  AND company_id =
    NULLIF(
      current_setting(
        'app.company_id',
        true
      ),
      ''
    )::uuid

  AND creator_employee_id =
    NULLIF(
      current_setting(
        'app.employee_id',
        true
      ),
      ''
    )::uuid

  AND public.app_has_effective_permission(
    'Document.Create'
  )

  AND EXISTS (
    SELECT 1
    FROM public.document_subtypes AS subtype

    JOIN public.document_types AS document_type
      ON document_type.id =
        subtype.document_type_id

    WHERE subtype.id =
      documents.document_subtype_id

      AND subtype.document_type_id =
        documents.document_type_id

      AND subtype.active = true
      AND document_type.active = true
  )

  AND EXISTS (
    SELECT 1
    FROM public.employee_assignments AS assignment

    JOIN public.office_divisions AS office_division
      ON office_division.id =
        assignment.office_division_id

    JOIN public.offices AS office
      ON office.id =
        office_division.office_id

    JOIN public.divisions AS division
      ON division.id =
        office_division.division_id

    WHERE assignment.employee_id =
      NULLIF(
        current_setting(
          'app.employee_id',
          true
        ),
        ''
      )::uuid

      AND assignment.active = true

      AND (
        assignment.valid_from IS NULL
        OR assignment.valid_from <= CURRENT_DATE
      )

      AND (
        assignment.valid_until IS NULL
        OR assignment.valid_until >= CURRENT_DATE
      )

      AND office_division.active = true

      AND office_division.office_id =
        documents.issuer_office_id

      AND office_division.division_id =
        documents.issuer_division_id

      AND office.active = true
      AND division.active = true

      AND office.company_id =
        documents.company_id

      AND division.company_id =
        documents.company_id
  )
);

-- ViewAll tidak boleh dipakai untuk edit Draft orang lain.
CREATE POLICY documents_update_policy
ON public.documents
FOR UPDATE
TO surat_runtime
USING (
  status = 'DRAFT'

  AND company_id =
    NULLIF(
      current_setting(
        'app.company_id',
        true
      ),
      ''
    )::uuid

  AND creator_employee_id =
    NULLIF(
      current_setting(
        'app.employee_id',
        true
      ),
      ''
    )::uuid

  AND public.app_has_effective_permission(
    'Document.Create'
  )
)
WITH CHECK (
  status = 'DRAFT'

  AND company_id =
    NULLIF(
      current_setting(
        'app.company_id',
        true
      ),
      ''
    )::uuid

  AND creator_employee_id =
    NULLIF(
      current_setting(
        'app.employee_id',
        true
      ),
      ''
    )::uuid

  AND public.app_has_effective_permission(
    'Document.Create'
  )

  AND EXISTS (
    SELECT 1
    FROM public.document_subtypes AS subtype

    JOIN public.document_types AS document_type
      ON document_type.id =
        subtype.document_type_id

    WHERE subtype.id =
      documents.document_subtype_id

      AND subtype.document_type_id =
        documents.document_type_id

      AND subtype.active = true
      AND document_type.active = true
  )

  AND EXISTS (
    SELECT 1
    FROM public.employee_assignments AS assignment

    JOIN public.office_divisions AS office_division
      ON office_division.id =
        assignment.office_division_id

    JOIN public.offices AS office
      ON office.id =
        office_division.office_id

    JOIN public.divisions AS division
      ON division.id =
        office_division.division_id

    WHERE assignment.employee_id =
      NULLIF(
        current_setting(
          'app.employee_id',
          true
        ),
        ''
      )::uuid

      AND assignment.active = true

      AND (
        assignment.valid_from IS NULL
        OR assignment.valid_from <= CURRENT_DATE
      )

      AND (
        assignment.valid_until IS NULL
        OR assignment.valid_until >= CURRENT_DATE
      )

      AND office_division.active = true

      AND office_division.office_id =
        documents.issuer_office_id

      AND office_division.division_id =
        documents.issuer_division_id

      AND office.active = true
      AND division.active = true

      AND office.company_id =
        documents.company_id

      AND division.company_id =
        documents.company_id
  )
);