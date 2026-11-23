import { WarningCircleIcon as AlertCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { CheckCircleIcon as CheckCircle2 } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { InfoIcon as Info } from '@phosphor-icons/react/dist/csr/Info';
import { WarningIcon as TriangleAlert } from '@phosphor-icons/react/dist/csr/Warning';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { HTMLAttributes, ReactNode } from 'react';

const alertVariants = cva(
  'relative flex w-full items-start gap-3 rounded-xl border p-4 text-sm transition-all',
  {
    variants: {
      variant: {
        info: 'border-blue-200 bg-blue-50/80 text-blue-900',
        success: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
        warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
        danger: 'border-red-200 bg-red-50/80 text-red-900',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  onDismiss?: () => void;
  children: ReactNode;
}

export function Alert({
  variant = 'info',
  title,
  onDismiss,
  children,
  className,
  role = variant === 'danger' ? 'alert' : 'status',
  ...props
}: AlertProps) {
  const Icon = iconMap[variant ?? 'info'];

  return (
    <div role={role} className={twMerge(clsx(alertVariants({ variant }), className))} {...props}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
      <div className="flex-1">
        {title && <h5 className="mb-1 font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-0.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
