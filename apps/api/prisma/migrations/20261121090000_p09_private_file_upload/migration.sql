-- P09: private file metadata. Binary content stays outside PostgreSQL.
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  source_method VARCHAR(20) NOT NULL DEFAULT 'UPLOAD',
  created_by_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT document_versions_document_id_version_no_key UNIQUE (document_id, version_no)
);
CREATE INDEX document_versions_document_id_idx ON public.document_versions(document_id);

CREATE TABLE public.storage_objects (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uploaded_by_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  provider VARCHAR(20) NOT NULL,
  pathname VARCHAR(500) NOT NULL UNIQUE,
  content_type VARCHAR(150) NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  access_mode VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' CHECK (access_mode = 'PRIVATE'),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.document_files (
  id UUID PRIMARY KEY,
  document_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  storage_object_id UUID NOT NULL REFERENCES public.storage_objects(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uploaded_by_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  file_role VARCHAR(20) NOT NULL CHECK (file_role IN ('MAIN', 'ATTACHMENT')),
  original_filename VARCHAR(255) NOT NULL,
  detected_mime VARCHAR(150) NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  processing_status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
  review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT document_files_storage_object_id_key UNIQUE (storage_object_id)
);
CREATE INDEX document_files_version_created_at_idx ON public.document_files(document_version_id, created_at);
CREATE UNIQUE INDEX document_files_one_main_per_version_idx
  ON public.document_files(document_version_id) WHERE file_role = 'MAIN';

REVOKE ALL ON public.document_versions, public.storage_objects, public.document_files
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.document_versions, public.storage_objects, public.document_files
  TO surat_runtime;

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_versions_select ON public.document_versions
  FOR SELECT TO surat_runtime USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id)
  );
CREATE POLICY document_versions_insert ON public.document_versions
  FOR INSERT TO surat_runtime WITH CHECK (
    created_by_employee_id = NULLIF(current_setting('app.employee_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id AND d.status = 'DRAFT'
        AND d.creator_employee_id = created_by_employee_id
        AND public.app_has_effective_permission('Document.Create')
    )
  );

-- Storage metadata is readable only after its document relation exists.
-- The uploader may read their new object during the insert transaction.
CREATE POLICY storage_objects_select ON public.storage_objects
  FOR SELECT TO surat_runtime USING (
    (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
      AND uploaded_by_employee_id = NULLIF(current_setting('app.employee_id', true), '')::uuid)
    OR
    EXISTS (
      SELECT 1 FROM public.document_files f
      JOIN public.document_versions v ON v.id = f.document_version_id
      JOIN public.documents d ON d.id = v.document_id
      WHERE f.storage_object_id = storage_objects.id
    )
  );
CREATE POLICY storage_objects_insert ON public.storage_objects
  FOR INSERT TO surat_runtime WITH CHECK (
    access_mode = 'PRIVATE'
    AND company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    AND uploaded_by_employee_id = NULLIF(current_setting('app.employee_id', true), '')::uuid
    AND public.app_has_effective_permission('Document.Create')
  );

CREATE POLICY document_files_select ON public.document_files
  FOR SELECT TO surat_runtime USING (
    EXISTS (
      SELECT 1 FROM public.document_versions v
      JOIN public.documents d ON d.id = v.document_id
      WHERE v.id = document_version_id
    )
  );
CREATE POLICY document_files_insert ON public.document_files
  FOR INSERT TO surat_runtime WITH CHECK (
    uploaded_by_employee_id = NULLIF(current_setting('app.employee_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM public.document_versions v
      JOIN public.documents d ON d.id = v.document_id
      WHERE v.id = document_version_id
        AND v.is_locked = false
        AND d.status = 'DRAFT'
        AND d.creator_employee_id = uploaded_by_employee_id
        AND public.app_has_effective_permission('Document.Create')
    )
  );
