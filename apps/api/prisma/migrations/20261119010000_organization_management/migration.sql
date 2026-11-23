BEGIN;

ALTER TABLE "employees" ADD COLUMN "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "organization_changes" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "actor_employee_id" UUID NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "target_type" VARCHAR(40) NOT NULL,
  "target_id" UUID NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_changes_target_time_idx"
  ON "organization_changes"("company_id", "target_type", "target_id", "occurred_at");

REVOKE ALL ON TABLE "organization_changes" FROM PUBLIC;
REVOKE ALL ON TABLE "organization_changes" FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE "organization_changes" TO surat_runtime;
ALTER TABLE "organization_changes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_changes_runtime_insert ON "organization_changes"
  FOR INSERT TO surat_runtime WITH CHECK (true);
CREATE POLICY organization_changes_runtime_select ON "organization_changes"
  FOR SELECT TO surat_runtime USING (true);

COMMIT;
