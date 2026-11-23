BEGIN;

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

  IF current_setting('app.organization_force_deactivate', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'companies' THEN
    SELECT
      EXISTS (SELECT 1 FROM public.offices WHERE company_id = OLD.id AND active)
      OR EXISTS (SELECT 1 FROM public.divisions WHERE company_id = OLD.id AND active)
      OR EXISTS (SELECT 1 FROM public.job_titles WHERE company_id = OLD.id AND active)
      OR EXISTS (SELECT 1 FROM public.employees
                 WHERE company_id = OLD.id AND status <> 'INACTIVE')
    INTO referenced;
  ELSIF TG_TABLE_NAME = 'offices' THEN
    SELECT EXISTS (SELECT 1 FROM public.office_divisions
                   WHERE office_id = OLD.id AND active) INTO referenced;
  ELSIF TG_TABLE_NAME = 'divisions' THEN
    SELECT EXISTS (SELECT 1 FROM public.office_divisions
                   WHERE division_id = OLD.id AND active) INTO referenced;
  ELSIF TG_TABLE_NAME = 'office_divisions' THEN
    SELECT EXISTS (SELECT 1 FROM public.employee_assignments
                   WHERE office_division_id = OLD.id AND active) INTO referenced;
  ELSIF TG_TABLE_NAME = 'job_titles' THEN
    SELECT EXISTS (SELECT 1 FROM public.employee_assignments
                   WHERE job_title_id = OLD.id AND active) INTO referenced;
  END IF;

  IF referenced THEN
    RAISE EXCEPTION 'P05_MASTER_STILL_REFERENCED' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
