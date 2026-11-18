import { useState, type FormEvent } from 'react';
import { Button } from '../ui/button.js';
import { Modal } from '../ui/modal.js';
import type { RecordItem } from '../types/index.js';

export interface EditRecordModalProps {
  open: boolean;
  item: RecordItem | null;
  resourceKey: string;
  field: string;
  fieldLabel: string;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, string>) => Promise<void>;
}

export function EditRecordModal({
  open,
  item,
  field,
  fieldLabel,
  onClose,
  onSave,
}: EditRecordModalProps) {
  const [value, setValue] = useState(item ? String(item[field] ?? '') : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Sync state when opened
  if (item && value === '' && String(item[field] ?? '') !== '') {
    setValue(String(item[field] ?? ''));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!item) {
      return;
    }

    if (!value.trim()) {
      setError(`${fieldLabel} tidak boleh kosong.`);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSave(item.id, { [field]: value.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui data.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ubah ${fieldLabel}`}
      description="Perbarui informasi data di bawah ini."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="edit-field-input">
            {fieldLabel}
          </label>
          <input
            id="edit-field-input"
            className="field"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            required
            autoFocus
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
