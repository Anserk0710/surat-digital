import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layers3 } from 'lucide-react';
import { ApiHttpError, login } from '../auth/auth-api.js';
import { baseUrl } from '../api.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatErrorMessage } from '../lib/error.js';
import { Button } from '../ui/button.js';
import { Alert } from '../ui/alert.js';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  interface LocationState {
    from?: { pathname?: string };
  }
  const from = (location.state as LocationState)?.from?.pathname ?? location.pathname;
  const targetUrl = !from || from === '/login' ? '/' : from;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await login(baseUrl, { identifier, password });
      loginUser(response.user);
      navigate(targetUrl, { replace: true });
    } catch (reason) {
      if (reason instanceof ApiHttpError && reason.status === 401) {
        setError('Identitas atau kata sandi tidak valid.');
      } else {
        setError(formatErrorMessage(reason));
      }
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left hero banner */}
      <section className="hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold tracking-tight">
          <Layers3 className="h-7 w-7 text-blue-300" />
          <span>Surat Digital</span>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Ruang kerja dokumen
          </p>
          <h1 className="max-w-lg text-5xl font-semibold leading-tight">
            Kelola surat dengan jelas, aman, dan terarah.
          </h1>
          <p className="mt-5 max-w-md text-blue-100 text-base leading-relaxed">
            Satu tempat untuk pekerjaan administrasi, workflow persetujuan, dan integritas dokumen
            perusahaan.
          </p>
        </div>
        <p className="text-sm text-blue-200">Surat Digital Platform © 2026</p>
      </section>

      {/* Right login form */}
      <section className="flex items-center justify-center p-6 bg-slate-50">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center gap-2 text-xl font-bold text-brand lg:hidden">
            <Layers3 className="h-6 w-6" />
            <span>Surat Digital</span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Masuk ke akun Anda</h2>
          <p className="mt-2 mb-7 text-sm text-slate-500">
            Gunakan email, username, atau NIP perusahaan.
          </p>

          <label className="label" htmlFor="identifier">
            Email, username, atau NIP
          </label>
          <input
            className="field mb-5"
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="nama@perusahaan.com / nip / username"
            required
          />

          <label className="label" htmlFor="password">
            Kata sandi
          </label>
          <input
            className="field mb-5"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="mb-5">
              <Alert variant="danger">{error}</Alert>
            </div>
          )}

          <Button className="w-full" disabled={busy}>
            {busy ? 'Memproses…' : 'Masuk'}
          </Button>

          <p className="mt-6 text-center text-sm text-slate-600">
            Belum punya akun?{' '}
            <Link className="font-semibold text-brand underline hover:text-blue-900" to="/register">
              Daftar
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
