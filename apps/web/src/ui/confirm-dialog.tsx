import { useEffect, useState } from 'react';
import { Button } from './button.js';
import { Modal } from './modal.js';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  busy?: boolean;
  requireAcknowledgement?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = 'Konfirmasi Tindakan',
  message,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  busy = false,
  requireAcknowledgement = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => {
    if (!open) {
      setAcknowledged(false);
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'default'}
            onClick={onConfirm}
            disabled={busy || (requireAcknowledgement && !acknowledged)}
          >
            {busy ? 'Memproses…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      {requireAcknowledgement && (
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          Saya memahami dampak tindakan ini dan ingin melanjutkan.
        </label>
      )}
    </Modal>
  );
}
