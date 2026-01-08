'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import type { StockAlert } from '@/types';

const alertBannerVariants = cva(
  'relative rounded-lg border-l-4 p-4 transition-all duration-300',
  {
    variants: {
      severity: {
        warning: 'border-l-warning bg-warning-muted',
        critical: 'border-l-destructive bg-destructive-muted',
      },
    },
    defaultVariants: {
      severity: 'warning',
    },
  }
);

interface StockAlertBannerProps {
  alerts: StockAlert[];
  className?: string;
}

export function StockAlertBanner({ alerts, className }: StockAlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {visibleAlerts.map((alert, index) => {
        const Icon = alert.severity === 'critical' ? XCircle : AlertTriangle;
        const iconColor =
          alert.severity === 'critical' ? 'text-destructive' : 'text-warning';

        const formattedDate = new Date(alert.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

        return (
          <div
            key={alert.id}
            role="alert"
            aria-live={alert.severity === 'critical' ? 'assertive' : 'polite'}
            className={cn(
              alertBannerVariants({ severity: alert.severity }),
              'animate-alert-slide-in pr-12',
              alert.severity === 'critical' && 'animate-attention-pulse'
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <Icon
                className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)}
                aria-hidden="true"
              />
              <div>
                <h4 className="text-sm font-display font-semibold text-foreground">
                  {alert.severity === 'critical'
                    ? 'Critical Stock Alert'
                    : 'Stock Warning'}
                </h4>
                <p className="text-sm text-foreground mt-1">
                  {alert.message}
                  <span className="font-mono text-xs ml-2 text-muted-foreground">
                    ({formattedDate})
                  </span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-black/5"
              onClick={() => handleDismiss(alert.id)}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// Single alert banner for simpler use cases
interface SingleAlertBannerProps {
  shortageDate: string | null;
  shortageAmount: number | null;
  severity?: 'warning' | 'critical';
  onDismiss?: () => void;
}

export function SingleStockAlertBanner({
  shortageDate,
  shortageAmount,
  severity = 'warning',
  onDismiss,
}: SingleAlertBannerProps) {
  if (!shortageDate) return null;

  const formattedDate = new Date(shortageDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const Icon = severity === 'critical' ? XCircle : AlertTriangle;
  const iconColor =
    severity === 'critical' ? 'text-destructive' : 'text-warning';

  return (
    <div
      role="alert"
      aria-live={severity === 'critical' ? 'assertive' : 'polite'}
      className={cn(
        alertBannerVariants({ severity }),
        onDismiss && 'pr-12',
        severity === 'critical' && 'animate-attention-pulse'
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)}
          aria-hidden="true"
        />
        <div>
          <h4 className="text-sm font-display font-semibold text-foreground">
            {severity === 'critical' ? 'Critical Stock Alert' : 'Stock Warning'}
          </h4>
          <p className="text-sm text-foreground mt-1">
            Stock shortage expected on{' '}
            <span className="font-semibold">{formattedDate}</span>.
            {shortageAmount && (
              <>
                {' '}
                Estimated shortage:{' '}
                <span className="font-mono font-semibold">
                  {shortageAmount.toLocaleString()}
                </span>{' '}
                units.
              </>
            )}
          </p>
        </div>
      </div>

      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-black/5"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
