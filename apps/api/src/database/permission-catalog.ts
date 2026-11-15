export interface PermissionDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export const permissionCatalog = [
  {
    code: 'User.View',
    name: 'View Users',
    description: 'Melitah direktori pengguna.',
  },
  {
    code: 'User.Manage',
    name: 'Manage Users',
    description: 'Mengelola pengguna dan proses import pengguna.',
  },
  {
    code: 'Group.View',
    name: 'View Groups',
    description: 'Melihat Group Policy.',
  },
  {
    code: 'Group.Manage',
    name: 'Manage Groups',
    description: 'Mengelola group, membership, dan permission.',
  },
  {
    code: 'Document.Create',
    name: 'Create Document',
    description: 'Membuat dokumen.',
  },
  {
    code: 'Document.ViewAll',
    name: 'View All Documents',
    description: 'Melihat seluruh dokumen perusahaan.',
  },
  {
    code: 'Document.Download',
    name: 'Download Document',
    description: 'Mengunduh dokumen yang memang dapat diakses pengguna.',
  },
  {
    code: 'Document.DownloadAll',
    name: 'Download All Documents',
    description: 'Mengunduh seluruh dokumen perusahaan.',
  },
  {
    code: 'Document.ExportArchive',
    name: 'Export Archive',
    description: 'Mengekspor arsip secara massal.',
  },
  {
    code: 'Approval.Execute',
    name: 'Execute Approval',
    description: 'Menyetujui dan menandatangani dokumen yang ditugaskan.',
  },
  {
    code: 'Approval.Reject',
    name: 'Reject Approval',
    description: 'Menolak dokumen yang ditugaskan.',
  },
  {
    code: 'Signature.Visual',
    name: 'Visual Signature',
    description: 'Menggunakan tanda tangan visual.',
  },
  {
    code: 'Signature.Internal',
    name: 'Internal Signature',
    description: 'Menggunakan TTE internal.',
  },
  {
    code: 'Template.Manage',
    name: 'Manage Templates',
    description: 'Mengelola template dokumen.',
  },
  {
    code: 'Form.Manage',
    name: 'Manage Forms',
    description: 'Mengelola Form Builder.',
  },
  {
    code: 'Archive.View',
    name: 'View Archive',
    description: 'Mengakses modul arsip.',
  },
  {
    code: 'Audit.View',
    name: 'View Audit Logs',
    description: 'Melihat Audit Log.',
  },
  {
    code: 'Audit.Export',
    name: 'Export Audit Logs',
    description: 'Mengekspor Audit Log.',
  },
  {
    code: 'Numbering.Manage',
    name: 'Manage Numbering',
    description: 'Mengelola konfigurasi penomoran.',
  },
  {
    code: 'System.Configure',
    name: 'Configure System',
    description: 'Mengelola konfigurasi sistem.',
  },
  {
    code: 'Workflow.Repair',
    name: 'Repair Workflow',
    description: 'Melakukan recovery participant BLOCKED secara teraudit.',
  },
] as const satisfies readonly PermissionDefinition[];
