import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/shared/api/generated/model';

const COLORS: Record<OrderStatus, string> = {
  NEW: 'bg-primary/15 text-primary',
  ACCEPTED: 'bg-sky-100 text-sky-800',
  COOKING: 'bg-amber-100 text-amber-800',
  READY: 'bg-emerald-100 text-emerald-800',
  SERVED: 'bg-violet-100 text-violet-800',
  PAID: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        COLORS[status],
      )}
    >
      {t(`orders.status.${status}`)}
    </span>
  );
}
