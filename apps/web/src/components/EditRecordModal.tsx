import { useState, type FormEvent } from 'react';
import { Button } from '../ui/button.js';
import { Modal } from '../ui/modal.js';
import type { RecordItem } from '../types/index.js';

export type EditField = {
  name: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'checkbox';
  options?: { value: string; label: string }[];
};

export interface EditRecordModalProps {
  item: RecordItem | null;
  title: string;
  fields: EditField[];
  onClose: () => void;
  onSave: (id: string, updates: Record<string, string | boolean | null>) => Promise<void>;
}

export function EditRecordModal({ item, title, fields, onClose, onSave }: EditRecordModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const updates: Record<string, string | boolean | null> = {};
    for (const field of fields) {
      if (field.type === 'checkbox') {
        updates[field.name] = form.has(field.name);
      } else {
        const value = String(form.get(field.name) ?? '').trim();
        updates[field.name] = field.required ? value : value || null;
      }
    }
    setBusy(true);
    setError('');
    try {
      await onSave(item.id, updates);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gagal memperbarui data.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={item !== null} onClose={onClose} title={`Ubah ${title}`}>
      {item && (
        <form key={item.id} onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const value = item[field.name];
            return (
              <label key={field.name} className="block">
                <span className="label">{field.label}</span>
                {field.type === 'checkbox' ? (
                  <input name={field.name} type="checkbox" defaultChecked={value === true} />
                ) : field.options ? (
                  <select
                    name={field.name}
                    className="field"
                    defaultValue={String(value ?? '')}
                    required={field.required}
                  >
                    {!field.required && <option value="">Tidak ada</option>}
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    className="field"
                    type={field.type ?? 'text'}
                    defaultValue={String(value ?? '').slice(
                      0,
                      field.type === 'date' ? 10 : undefined,
                    )}
                    required={field.required}
                  />
                )}
              </label>
            );
          })}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
