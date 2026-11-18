import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes } from 'react';

const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-white hover:bg-blue-900',
        outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
        ghost: 'text-slate-700 hover:bg-slate-100',
        danger: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: {
        default: 'min-h-10 px-4 py-2',
        sm: 'min-h-8 px-3 py-1.5 text-xs',
        lg: 'min-h-12 px-6 py-3 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles> & { asChild?: boolean };

export function Button({ asChild = false, variant, size, className, ...props }: Props) {
  const Component = asChild ? Slot : 'button';
  return <Component className={twMerge(clsx(styles({ variant, size }), className))} {...props} />;
}
