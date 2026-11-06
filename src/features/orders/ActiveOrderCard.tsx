import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useOrdersControllerChangeStatus,
  useOrdersControllerClose,
} from '@/shared/api/generated/orders/orders';
import type { OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions } from '@/shared/auth/session-store';
import { formatMoney } from '@/shared/lib/format';
import { celebrate } from '@/shared/ui/Celebration';
import { ErrorText } from '@/shared/ui/ErrorText';
import { elapsed } from './active-groups';
import { maySetStatus, mayTakePayment, nextStatus } from './order-rules';
import { PaymentDialog } from './PaymentDialog';
import { SourceBadge } from './SourceBadge';
import { StatusBadge } from './StatusBadge';

function PaymentState({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const unpaid = order.total - order.paidAmount;
  const [text, color] =
    unpaid <= 0
      ? [t('orders.active.paid'), 'text-emerald-700']
      : order.paidAmount > 0
        ? [
            t('orders.active.partlyPaid', { amount: formatMoney(unpaid) }),
            'text-amber-700',
          ]
        : [t('orders.active.notPaid'), 'text-muted-foreground'];
  return <span className={cn('text-sm font-medium', color)}>{text}</span>;
}

/** All that is needed to deal with an order, without opening it. */
export function ActiveOrderCard({
  order,
  place,
  minutes,
  onOpen,
}: {
  order: OrderDto;
  place: string;
  minutes: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [paying, setPaying] = useState(false);
  // On failure too: a conflict means this screen is behind someone else's change.
  const mutation = {
    mutation: {
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
    },
  };
  const changeStatus = useOrdersControllerChangeStatus(mutation);
  const close = useOrdersControllerClose(mutation);

  const unpaid = order.total - order.paidAmount;
  const next = nextStatus(order.status);
  const busy = changeStatus.isPending || close.isPending;
  const mayAdvance =
    next !== null && next !== 'PAID' && maySetStatus(permissions, next);
  const mayPay = mayTakePayment(permissions) && unpaid > 0;
  const mayClose =
    mayTakePayment(permissions) && order.status === 'SERVED' && unpaid === 0;
  const time = elapsed(minutes);

  return (
    <article className="flex h-full flex-col rounded-2xl border bg-card shadow-xs">
      <button
        type="button"
        aria-label={t('orders.active.open', { number: order.displayNumber })}
        onClick={onOpen}
        className="flex-1 space-y-2 rounded-t-2xl p-3.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-heading text-xl font-bold">
              {t('orders.title', { number: order.displayNumber })}
            </span>
            <SourceBadge source={order.source} />
          </span>
          <StatusBadge status={order.status} />
        </span>
        <span className="block text-sm text-muted-foreground">
          {place} · {t(time.key, time.values)}
        </span>
        <span className="block text-sm">
          {order.items
            .map((item) => `${item.quantity} × ${item.name}`)
            .join(', ')}
        </span>
        <span className="flex items-baseline justify-between gap-3 pt-1">
          <PaymentState order={order} />
          <span className="font-semibold whitespace-nowrap">
            {formatMoney(order.total)}
          </span>
        </span>
      </button>
      {(mayAdvance || mayPay || mayClose) && (
        <div className="space-y-2 border-t p-2.5">
          <ErrorText error={changeStatus.error ?? close.error} />
          <div className="flex gap-2">
            {mayAdvance && (
              <Button
                variant="secondary"
                className="h-11 flex-auto px-4"
                disabled={busy}
                onClick={() =>
                  changeStatus.mutate({
                    id: order.id,
                    data: { status: next },
                  })
                }
              >
                {t(`orders.advance.${next}`)}
              </Button>
            )}
            {mayPay && (
              <Button
                className="h-11 flex-auto px-4"
                onClick={() => setPaying(true)}
              >
                {t('orders.active.pay')}
              </Button>
            )}
            {mayClose && (
              <Button
                className="h-11 flex-auto px-4"
                disabled={busy}
                onClick={() =>
                  close.mutate(
                    { id: order.id },
                    { onSuccess: () => celebrate(t('orders.closedMessage')) },
                  )
                }
              >
                {t('orders.close')}
              </Button>
            )}
          </div>
        </div>
      )}
      <PaymentDialog order={order} open={paying} onOpenChange={setPaying} />
    </article>
  );
}
