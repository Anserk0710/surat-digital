
-- Expect zero rows from every query.

-- Invalid cross-company office/division mapping
SELECT od.id
FROM public.office_divisions od
JOIN public.offices o ON o.id = od.office_id
JOIN public.divisions d ON d.id = od.division_id
WHERE o.company_id <> d.company_id;

-- Invalid assignment tenant
SELECT ea.id
FROM public.employee_assignments ea
JOIN public.employees e ON e.id = ea.employee_id
JOIN public.office_divisions od ON od.id = ea.office_division_id
JOIN public.offices o ON o.id = od.office_id
WHERE e.company_id <> o.company_id;

-- Invalid assignment date range
SELECT id
FROM public.employee_assignments
WHERE valid_from IS NOT NULL
  AND valid_until IS NOT NULL
  AND valid_until < valid_from;

-- Duplicate active primary assignment
SELECT employee_id, COUNT(*)
FROM public.employee_assignments
WHERE active = true AND is_primary = true
GROUP BY employee_id
HAVING COUNT(*) > 1;

-- Existing invalid office timezone
SELECT o.id, o.timezone
FROM public.offices o
WHERE o.timezone !~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+)$'
   OR NOT EXISTS (
      SELECT 1
      FROM pg_timezone_names t
      WHERE t.name = o.timezone
   );
