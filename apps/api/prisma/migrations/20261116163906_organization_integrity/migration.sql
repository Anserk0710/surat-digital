-- This is an empty migration.


-- P05 — Organization integrity
-- Run using surat_migrator via Prisma Migrate.

-- 1. Assignment date integrity
ALTER TABLE public.employee_assignments
ADD CONSTRAINT p05_assignment_valid_dates
CHECK (
  valid_from IS NULL
  OR valid_until IS NULL
  OR valid_until >= valid_from
);

-- One active primary assignment per employee.
CREATE UNIQUE INDEX p05_one_active_primary_assignment
ON public.employee_assignments(employee_id)
WHERE active = true AND is_primary = true;

-- 2. Restrict reparenting across companies.
CREATE OR REPLACE FUNCTION public.p05_immutable_company()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'P05_COMPANY_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p05_office_company_immutable
BEFORE UPDATE OF company_id ON public.offices
FOR EACH ROW EXECUTE FUNCTION public.p05_immutable_company();

CREATE TRIGGER p05_division_company_immutable
BEFORE UPDATE OF company_id ON public.divisions
FOR EACH ROW EXECUTE FUNCTION public.p05_immutable_company();

CREATE TRIGGER p05_job_title_company_immutable
BEFORE UPDATE OF company_id ON public.job_titles
FOR EACH ROW EXECUTE FUNCTION public.p05_immutable_company();

CREATE TRIGGER p05_employee_company_immutable
BEFORE UPDATE OF company_id ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.p05_immutable_company();

-- 3. Validate IANA timezone against PostgreSQL tzdata.
CREATE OR REPLACE FUNCTION public.p05_validate_timezone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.timezone !~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+)$'
     OR NOT EXISTS (
       SELECT 1 FROM pg_timezone_names
       WHERE name = NEW.timezone
     )
  THEN
    RAISE EXCEPTION 'P05_INVALID_TIMEZONE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p05_office_timezone_guard
BEFORE INSERT OR UPDATE OF timezone ON public.offices
FOR EACH ROW EXECUTE FUNCTION public.p05_validate_timezone();

-- 4. OfficeDivision must connect entities of the same company.
CREATE OR REPLACE FUNCTION public.p05_validate_office_division()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed boolean;
BEGIN
  SELECT
    o.company_id = d.company_id
    AND (
      NOT NEW.active
      OR (o.active AND d.active AND c.active)
    )
  INTO allowed
  FROM public.offices o
  JOIN public.divisions d ON d.id = NEW.division_id
  JOIN public.companies c ON c.id = o.company_id
  WHERE o.id = NEW.office_id;

  IF allowed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P05_INVALID_OFFICE_DIVISION'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p05_office_division_guard
BEFORE INSERT OR UPDATE OF office_id, division_id, active
ON public.office_divisions
FOR EACH ROW EXECUTE FUNCTION public.p05_validate_office_division();

-- 5. Assignment must remain in the employee's company.
CREATE OR REPLACE FUNCTION public.p05_validate_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  employee_company uuid;
  organization_company uuid;
  organization_active boolean;
  job_company uuid;
  job_active boolean;
BEGIN
  SELECT company_id
  INTO employee_company
  FROM public.employees
  WHERE id = NEW.employee_id;

  SELECT o.company_id,
         od.active AND o.active AND d.active AND c.active
  INTO organization_company, organization_active
  FROM public.office_divisions od
  JOIN public.offices o ON o.id = od.office_id
  JOIN public.divisions d ON d.id = od.division_id
  JOIN public.companies c ON c.id = o.company_id
  WHERE od.id = NEW.office_division_id
    AND o.company_id = d.company_id;

  IF employee_company IS NULL
     OR organization_company IS NULL
     OR employee_company <> organization_company
     OR (NEW.active AND organization_active IS DISTINCT FROM true)
  THEN
    RAISE EXCEPTION 'P05_INVALID_ASSIGNMENT_ORGANIZATION'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.job_title_id IS NOT NULL THEN
    SELECT company_id, active
    INTO job_company, job_active
    FROM public.job_titles
    WHERE id = NEW.job_title_id;

    IF job_company IS NULL
       OR job_company <> employee_company
       OR (NEW.active AND job_active IS DISTINCT FROM true)
    THEN
      RAISE EXCEPTION 'P05_INVALID_ASSIGNMENT_JOB_TITLE'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p05_employee_assignment_guard
BEFORE INSERT OR UPDATE OF
  employee_id, office_division_id, job_title_id, active
ON public.employee_assignments
FOR EACH ROW EXECUTE FUNCTION public.p05_validate_assignment();

-- 6. Block deactivation while active descendants exist.
CREATE OR REPLACE FUNCTION public.p05_guard_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  referenced boolean := false;
BEGIN
  IF NOT OLD.active OR NEW.active THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'companies' THEN
    SELECT
      EXISTS (SELECT 1 FROM public.offices
              WHERE company_id = OLD.id AND active)
      OR EXISTS (SELECT 1 FROM public.divisions
                 WHERE company_id = OLD.id AND active)
      OR EXISTS (SELECT 1 FROM public.job_titles
                 WHERE company_id = OLD.id AND active)
      OR EXISTS (SELECT 1 FROM public.employees
                 WHERE company_id = OLD.id
                   AND status <> 'INACTIVE')
    INTO referenced;

  ELSIF TG_TABLE_NAME = 'offices' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.office_divisions
      WHERE office_id = OLD.id AND active
    ) INTO referenced;

  ELSIF TG_TABLE_NAME = 'divisions' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.office_divisions
      WHERE division_id = OLD.id AND active
    ) INTO referenced;

  ELSIF TG_TABLE_NAME = 'office_divisions' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.employee_assignments
      WHERE office_division_id = OLD.id AND active
    ) INTO referenced;

  ELSIF TG_TABLE_NAME = 'job_titles' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.employee_assignments
      WHERE job_title_id = OLD.id AND active
    ) INTO referenced;
  END IF;

  IF referenced THEN
    RAISE EXCEPTION 'P05_MASTER_STILL_REFERENCED'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p05_company_deactivation
BEFORE UPDATE OF active ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.p05_guard_deactivation();

CREATE TRIGGER p05_office_deactivation
BEFORE UPDATE OF active ON public.offices
FOR EACH ROW EXECUTE FUNCTION public.p05_guard_deactivation();

CREATE TRIGGER p05_division_deactivation
BEFORE UPDATE OF active ON public.divisions
FOR EACH ROW EXECUTE FUNCTION public.p05_guard_deactivation();

CREATE TRIGGER p05_office_division_deactivation
BEFORE UPDATE OF active ON public.office_divisions
FOR EACH ROW EXECUTE FUNCTION public.p05_guard_deactivation();

CREATE TRIGGER p05_job_title_deactivation
BEFORE UPDATE OF active ON public.job_titles
FOR EACH ROW EXECUTE FUNCTION public.p05_guard_deactivation();

-- 7. Block master activation while the parent company is inactive.
CREATE OR REPLACE FUNCTION public.p05_validate_master_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.active AND NOT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = NEW.company_id AND active = true
  ) THEN
    RAISE EXCEPTION 'P05_INACTIVE_PARENT_COMPANY'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER p05_office_activation_guard
BEFORE INSERT OR UPDATE OF active ON public.offices
FOR EACH ROW
EXECUTE FUNCTION public.p05_validate_master_activation();

CREATE TRIGGER p05_division_activation_guard
BEFORE INSERT OR UPDATE OF active ON public.divisions
FOR EACH ROW
EXECUTE FUNCTION public.p05_validate_master_activation();

CREATE TRIGGER p05_job_title_activation_guard
BEFORE INSERT OR UPDATE OF active ON public.job_titles
FOR EACH ROW
EXECUTE FUNCTION public.p05_validate_master_activation();
