-- Run with authorized migration credentials before applying P06.
-- Expected result: zero rows. Repair invalid relations explicitly;
-- never delete them automatically from this preflight.
SELECT
  eg.id AS membership_id,
  e.company_id AS employee_company,
  g.company_id AS group_company
FROM public.employee_groups eg
JOIN public.employees e ON e.id = eg.employee_id
JOIN public.groups g ON g.id = eg.group_id
WHERE e.company_id <> g.company_id;

-- Run after applying P06. Expected: true, true, false, false.
SELECT
  has_table_privilege(
    'surat_runtime',
    'public.group_policy_audit',
    'SELECT'
  ) AS can_select,
  has_table_privilege(
    'surat_runtime',
    'public.group_policy_audit',
    'INSERT'
  ) AS can_insert,
  has_table_privilege(
    'surat_runtime',
    'public.group_policy_audit',
    'UPDATE'
  ) AS can_update,
  has_table_privilege(
    'surat_runtime',
    'public.group_policy_audit',
    'DELETE'
  ) AS can_delete;
