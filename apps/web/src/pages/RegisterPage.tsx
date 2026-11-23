import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { CheckCircleIcon as CheckCircle2 } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { request } from '../api.js';
import { formatErrorMessage } from '../lib/error.js';
import { Button } from '../ui/button.js';
import { Alert } from '../ui/alert.js';
import { Card } from '../ui/card.js';

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
}

const fields: FieldConfig[] = [
  {
    key: 'companyCode',
    label: 'Kode perusahaan',
    type: 'text',
    placeholder: 'Contoh: ACME_CORP',
    helpText: 'Dapatkan kode perusahaan dari administrator sistem Anda',
  },
  {
    key: 'employeeNumber',
    label: 'NIP',
    type: 'text',
    placeholder: 'Nomor Induk Pegawai',
  },
  {
    key: 'username',
    label: 'Username',
    type: 'text',
    placeholder: 'username_pegawai',
  },
  {
    key: 'fullName',
    label: 'Nama lengkap',
    type: 'text',
    placeholder: 'Nama Lengkap Anda',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'nama@perusahaan.com',
  },
  {
    key: 'password',
    label: 'Kata sandi',
    type: 'password',
    placeholder: 'Minimal 8 karakter',
    helpText: 'Gunakan kombinasi huruf besar, kecil, angka, dan simbol',
  },
];

export function RegisterPage() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    // Client-side quick checks
    const password = String(data.password ?? '');
    if (password.length < 8) {
      setError('Kata sandi harus minimal 8 karakter.');
      setBusy(false);
      return;
    }

    try {
      await request('/users/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setDone(true);
    } catch (reason) {
      setError(formatErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6 pt-12">
      <Card className="p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline mb-6"
        >
          <ArrowLeft size={16} /> Kembali ke login
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">Registrasi karyawan</h1>
        <p className="mb-6 text-sm text-slate-500">
          Daftarkan akun karyawan Anda untuk mengakses portal Surat Digital.
        </p>

        {done ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-900">Registrasi Berhasil</h4>
                  <p className="mt-1 text-sm text-emerald-800">
                    Permintaan registrasi diterima. Administrator akan memverifikasi akun Anda.
                  </p>
                </div>
              </div>
            </div>
            <Link to="/login">
              <Button className="w-full mt-2">Kembali ke Halaman Masuk</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {fields.map(({ key, label, type, placeholder, helpText }) => (
              <div key={key}>
                <label className="label" htmlFor={`reg-${key}`}>
                  {label}
                </label>
                <input
                  id={`reg-${key}`}
                  className="field"
                  name={key}
                  type={type}
                  placeholder={placeholder}
                  required
                />
                {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
              </div>
            ))}

            {error && (
              <div className="pt-2">
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            <div className="pt-2">
              <Button className="w-full" disabled={busy}>
                {busy ? 'Mengirim…' : 'Kirim registrasi'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}
