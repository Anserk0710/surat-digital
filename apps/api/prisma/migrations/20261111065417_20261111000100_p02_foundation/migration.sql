-- ============================================================
-- P02 — Prisma/Supabase Foundation
-- ============================================================

CREATE TYPE "EmployeeStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE'
);

CREATE TYPE "PermissionEffect" AS ENUM (
  'ALLOW',
  'DENY'
);

-- ============================================================
-- companies
-- ============================================================

CREATE TABLE "companies" (
  "id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "companies_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_code_key"
  ON "companies"("code");

-- ============================================================
-- offices
-- ============================================================

CREATE TABLE "offices" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "timezone" VARCHAR(100) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "offices_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offices_company_id_code_key"
  ON "offices"("company_id", "code");

CREATE INDEX "offices_company_id_idx"
  ON "offices"("company_id");

ALTER TABLE "offices"
  ADD CONSTRAINT "offices_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- divisions
-- ============================================================

CREATE TABLE "divisions" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "divisions_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "divisions_company_id_code_key"
  ON "divisions"("company_id", "code");

CREATE INDEX "divisions_company_id_idx"
  ON "divisions"("company_id");

ALTER TABLE "divisions"
  ADD CONSTRAINT "divisions_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- office_divisions
-- ============================================================

CREATE TABLE "office_divisions" (
  "id" UUID NOT NULL,
  "office_id" UUID NOT NULL,
  "division_id" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "office_divisions_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "office_divisions_office_id_division_id_key"
  ON "office_divisions"("office_id", "division_id");

CREATE INDEX "office_divisions_division_id_idx"
  ON "office_divisions"("division_id");

ALTER TABLE "office_divisions"
  ADD CONSTRAINT "office_divisions_office_id_fkey"
  FOREIGN KEY ("office_id")
  REFERENCES "offices"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "office_divisions"
  ADD CONSTRAINT "office_divisions_division_id_fkey"
  FOREIGN KEY ("division_id")
  REFERENCES "divisions"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- job_titles
-- ============================================================

CREATE TABLE "job_titles" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_titles_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_titles_company_id_code_key"
  ON "job_titles"("company_id", "code");

CREATE INDEX "job_titles_company_id_idx"
  ON "job_titles"("company_id");

ALTER TABLE "job_titles"
  ADD CONSTRAINT "job_titles_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- employees
-- ============================================================

CREATE TABLE "employees" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "auth_user_id" UUID,
  "employee_number" VARCHAR(100) NOT NULL,
  "username" VARCHAR(100) NOT NULL,
  "username_normalized" VARCHAR(100) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "email_normalized" VARCHAR(320) NOT NULL,
  "full_name" VARCHAR(200) NOT NULL,
  "status" "EmployeeStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employees_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employees_auth_user_id_key"
  ON "employees"("auth_user_id");

CREATE UNIQUE INDEX "employees_company_id_employee_number_key"
  ON "employees"("company_id", "employee_number");

CREATE UNIQUE INDEX "employees_company_id_username_normalized_key"
  ON "employees"("company_id", "username_normalized");

CREATE UNIQUE INDEX "employees_company_id_email_normalized_key"
  ON "employees"("company_id", "email_normalized");

CREATE INDEX "employees_company_id_idx"
  ON "employees"("company_id");

CREATE INDEX "employees_company_id_status_idx"
  ON "employees"("company_id", "status");

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- employee_assignments
-- ============================================================

CREATE TABLE "employee_assignments" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "office_division_id" UUID NOT NULL,
  "job_title_id" UUID,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "valid_from" DATE,
  "valid_until" DATE,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_assignments_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "employee_assignments_employee_id_idx"
  ON "employee_assignments"("employee_id");

CREATE INDEX "employee_assignments_office_division_id_idx"
  ON "employee_assignments"("office_division_id");

CREATE INDEX "employee_assignments_job_title_id_idx"
  ON "employee_assignments"("job_title_id");

ALTER TABLE "employee_assignments"
  ADD CONSTRAINT "employee_assignments_employee_id_fkey"
  FOREIGN KEY ("employee_id")
  REFERENCES "employees"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "employee_assignments"
  ADD CONSTRAINT "employee_assignments_office_division_id_fkey"
  FOREIGN KEY ("office_division_id")
  REFERENCES "office_divisions"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "employee_assignments"
  ADD CONSTRAINT "employee_assignments_job_title_id_fkey"
  FOREIGN KEY ("job_title_id")
  REFERENCES "job_titles"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- groups
-- ============================================================

CREATE TABLE "groups" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "groups_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "groups_company_id_code_key"
  ON "groups"("company_id", "code");

CREATE INDEX "groups_company_id_idx"
  ON "groups"("company_id");

ALTER TABLE "groups"
  ADD CONSTRAINT "groups_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- permissions
-- ============================================================

CREATE TABLE "permissions" (
  "id" UUID NOT NULL,
  "code" VARCHAR(150) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "permissions_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_code_key"
  ON "permissions"("code");

-- ============================================================
-- employee_groups
-- ============================================================

CREATE TABLE "employee_groups" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_groups_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_groups_employee_id_group_id_key"
  ON "employee_groups"("employee_id", "group_id");

CREATE INDEX "employee_groups_group_id_idx"
  ON "employee_groups"("group_id");

ALTER TABLE "employee_groups"
  ADD CONSTRAINT "employee_groups_employee_id_fkey"
  FOREIGN KEY ("employee_id")
  REFERENCES "employees"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "employee_groups"
  ADD CONSTRAINT "employee_groups_group_id_fkey"
  FOREIGN KEY ("group_id")
  REFERENCES "groups"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================
-- group_permissions
-- ============================================================

CREATE TABLE "group_permissions" (
  "id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "effect" "PermissionEffect" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "group_permissions_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "group_permissions_group_id_permission_id_key"
  ON "group_permissions"("group_id", "permission_id");

CREATE INDEX "group_permissions_permission_id_idx"
  ON "group_permissions"("permission_id");

ALTER TABLE "group_permissions"
  ADD CONSTRAINT "group_permissions_group_id_fkey"
  FOREIGN KEY ("group_id")
  REFERENCES "groups"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "group_permissions"
  ADD CONSTRAINT "group_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id")
  REFERENCES "permissions"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;