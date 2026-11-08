import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useOrdersControllerCancel } from '@/shared/api/generated/orders/orders';
import type { OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { formatMoney } from '@/shared/lib/format';
import { ErrorText } from '@/shared/ui/ErrorText';

/** i18n keys under `orders.cancelReasons`; the chosen text is what the customer reads. */
const REASONS = ['soldOut', 'declined', 'noAnswer', 'customer'] as const;

function CancelForm({
  order,
  onDone,
}: {
  order: OrderDto;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const cancel = useOrdersControllerCancel({
    mutation: {
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
    },
  });
  const reason =
    chosen === 'other'
      ? other.trim()
      : chosen
        ? t(`orders.cancelReasons.${chosen}`)
        : '';

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('orders.cancelReason')}</p>
        <div className="flex flex-wrap gap-2">
          {[...REASONS, 'other' as const].map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={chosen === key}
              onClick={() => setChosen(chosen === key ? null : key)}
              className={cn(
                'min-h-11 rounded-xl border px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                chosen === key
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'bg-card hover:bg-muted',
              )}
            >
              {t(`orders.cancelReasons.${key}`)}
            </button>
          ))}
        </div>
        {chosen === 'other' && (
          <Input
            autoFocus
            aria-label={t('orders.cancelReasons.other')}
            maxLength={300}
            className="h-11 text-base"
            value={other}
            onChange={(event) => setOther(event.target.value)}
          />
        )}
        <p className="text-xs text-muted-foreground">
          {t('orders.cancelReasonHint')}
        </p>
      </div>
      <ErrorText error={cancel.error} />
      <AlertDialogFooter>
        <Button variant="outline" className="h-11" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="destructive"
          className="h-11"
          disabled={cancel.isPending}
          onClick={() =>
            cancel.mutate(
              { id: order.id, data: reason ? { reason } : {} },
              { onSuccess: onDone },
            )
          }
        >
          {t('orders.cancel')}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

/** Asks why, so the customer is told more than "cancelled". A reason is not required. */
export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: OrderDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('orders.cancelTitle', { number: order.displayNumber })}
          </AlertDialogTitle>
          {order.paidAmount > 0 && (
            <AlertDialogDescription>
              {t('orders.cancelPaidWarning', {
                amount: formatMoney(order.paidAmount),
              })}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {/* Mounted per opening, so a reason picked last time is not still chosen. */}
        {open && (
          <CancelForm order={order} onDone={() => onOpenChange(false)} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
