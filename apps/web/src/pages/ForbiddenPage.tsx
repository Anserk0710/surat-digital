import { ShieldWarningIcon as ShieldAlert } from '@phosphor-icons/react/dist/csr/ShieldWarning';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button.js';
import { Card } from '../ui/card.js';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md text-center p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">403 — Akses Ditolak</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Anda tidak memiliki izin yang cukup untuk mengakses halaman atau fitur ini. Silakan
          hubungi administrator untuk penyesuaian Group Policy akun Anda.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/">
            <Button>Kembali ke Beranda</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
