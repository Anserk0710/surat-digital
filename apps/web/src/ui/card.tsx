import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx('rounded-2xl border border-slate-200 bg-white p-6 shadow-xs', className),
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
}: {
  className?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4',
          className,
        ),
      )}
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
