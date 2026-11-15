-- Application data is accessed only through the NestJS/Prisma runtime role.
-- Supabase Data API roles must not have direct privileges on application tables.
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
