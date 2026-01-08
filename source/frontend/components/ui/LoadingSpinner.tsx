'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    color: {
      primary: 'text-primary',
      secondary: 'text-secondary',
      muted: 'text-muted-foreground',
      white: 'text-white',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'primary',
  },
});

interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export function LoadingSpinner({
  size,
  color,
  label = 'Loading...',
  className,
  showLabel = true,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn(spinnerVariants({ size, color }))} aria-hidden="true" />
      {showLabel && label && (
        <span className={cn('text-sm', color === 'white' ? 'text-white' : 'text-muted-foreground')}>
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Inline spinner for buttons and small areas
interface InlineSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
}

export function InlineSpinner({ size = 'sm', color, className }: InlineSpinnerProps) {
  return (
    <Loader2
      className={cn(spinnerVariants({ size, color }), className)}
      aria-hidden="true"
    />
  );
}
