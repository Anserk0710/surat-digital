import { FileTextIcon as FileQuestion } from '@phosphor-icons/react/dist/csr/FileText';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button.js';
import { Card } from '../ui/card.js';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md text-center p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FileQuestion size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">404 — Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Halaman yang Anda tuju tidak ditemukan atau telah dipindahkan.
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
