import { useState, type FormEvent } from 'react';
import { BuildingsIcon as Building } from '@phosphor-icons/react/dist/csr/Buildings';
import { EnvelopeIcon as Mail } from '@phosphor-icons/react/dist/csr/Envelope';
import { ShieldIcon as Shield } from '@phosphor-icons/react/dist/csr/Shield';
import { UserIcon as UserRound } from '@phosphor-icons/react/dist/csr/User';
import { request } from '../api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { formatErrorMessage } from '../lib/error.js';
import { Button } from '../ui/button.js';
import { Card, CardHeader } from '../ui/card.js';
import { Badge } from '../ui/badge.js';

export function ProfilePage() {
  const { user, reloadAuth } = useAuth();
  const [name, setName] = useState(user?.fullName ?? '');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setBusy(true);
    setFeedback('');
    try {
      await request('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: name.trim() }),
      });
      await reloadAuth();
      const msg = 'Profil tersimpan.';
      setFeedback(msg);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <UserRound className="h-6 w-6 text-brand" />
          <span>Profil Saya</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Informasi identitas akun dan penyesuaian data pribadi Anda.
        </p>
      </div>

      {/* Profile Form Card */}
      <Card className="panel">
        <CardHeader
          title="Informasi Pribadi"
          description="Perbarui nama lengkap yang akan dicantumkan pada surat dan audit sistem"
          action={<Badge variant="success">Akun Aktif</Badge>}
        />

        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="label" htmlFor="profile-fullname">
              Nama lengkap
            </label>
            <input
              id="profile-fullname"
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              placeholder="Nama lengkap Anda"
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Detail Akun Perusahaan
            </h4>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Shield size={16} className="text-slate-400 shrink-0" />
                <span>NIP {user.employeeNumber}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Building size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{user.company?.name}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <UserRound size={16} className="text-slate-400 shrink-0" />
                <span>@{user.username}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {feedback ? (
              <p role="status" className="text-sm font-medium text-emerald-700">
                {feedback}
              </p>
            ) : (
              <span />
            )}

            <Button disabled={busy} className="self-end">
              {busy ? 'Menyimpan…' : 'Simpan profil'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
