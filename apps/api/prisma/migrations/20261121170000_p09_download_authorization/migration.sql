-- P09 remediation: viewing and downloading remain separate capabilities.
-- DEFAULT: creator OR Document.ViewAll.
-- DOCUMENT_DOWNLOAD: creator OR Document.ViewAll OR Document.DownloadAll.
-- Document.Download itself does NOT expand visibility.
DROP POLICY IF EXISTS documents_select_policy ON public.documents;

CREATE POLICY documents_select_policy
ON public.documents
FOR SELECT
TO surat_runtime
USING (
  company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
  AND (
    creator_employee_id = NULLIF(current_setting('app.employee_id', true), '')::uuid
    OR public.app_has_effective_permission('Document.ViewAll')
    OR (
      current_setting('app.access_purpose', true) = 'DOCUMENT_DOWNLOAD'
      AND public.app_has_effective_permission('Document.DownloadAll')
    )
  )
);
