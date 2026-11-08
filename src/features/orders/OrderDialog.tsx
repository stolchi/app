import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useOrdersControllerCancel,
  useOrdersControllerChangeStatus,
  useOrdersControllerClose,
  useOrdersControllerGet,
  useOrdersControllerMoveToTable,
} from '@/shared/api/generated/orders/orders';
import type { OrderDto, Permission } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions } from '@/shared/auth/session-store';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { useHeldValue } from '@/shared/lib/use-held-value';
import { celebrate } from '@/shared/ui/Celebration';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ErrorText } from '@/shared/ui/ErrorText';
import { QueryState } from '@/shared/ui/QueryState';
import {
  isInProgress,
  mayCancel,
  mayEdit,
  maySetStatus,
  mayTakePayment,
  nextStatus,
} from './order-rules';
import { OrderAmounts } from './OrderAmounts';
import { OrderEditDialog } from './OrderEditDialog';
import { PaymentDialog } from './PaymentDialog';
import { TablePicker } from './TablePicker';
import { SourceBadge } from './SourceBadge';
import { StatusBadge } from './StatusBadge';
import { useTables } from './use-tables';

function OrderActions({
  order,
  permissions,
}: {
  order: OrderDto;
  permissions: readonly Permission[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [editing, setEditing] = useState(false);

  // On failure too: a conflict means this screen is behind someone else's change.
  const mutation = {
    mutation: {
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
    },
  };
  const changeStatus = useOrdersControllerChangeStatus(mutation);
  const close = useOrdersControllerClose(mutation);
  const cancel = useOrdersControllerCancel(mutation);
  const moveTo = useOrdersControllerMoveToTable(mutation);

  const unpaid = order.total - order.paidAmount;
  const next = nextStatus(order.status);
  const busy = changeStatus.isPending || close.isPending;

  return (
    <div className="space-y-2">
      <ErrorText error={changeStatus.error ?? close.error ?? moveTo.error} />
      <div className="grid gap-2 sm:grid-cols-2">
        {next && next !== 'PAID' && maySetStatus(permissions, next) && (
          <Button
            variant="secondary"
            className="h-12 text-base"
            disabled={busy}
            onClick={() =>
              changeStatus.mutate({ id: order.id, data: { status: next } })
            }
          >
            {t(`orders.advance.${next}`)}
          </Button>
        )}
        {mayTakePayment(permissions) && unpaid > 0 && (
          <Button className="h-12 text-base" onClick={() => setPaying(true)}>
            {t('orders.takePayment')}
          </Button>
        )}
        {mayTakePayment(permissions) &&
          order.status === 'SERVED' &&
          unpaid === 0 && (
            <Button
              className="h-12 text-base"
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
        {mayEdit(permissions) && (
          <Button
            variant="outline"
            className="h-12 text-base"
            onClick={() => setEditing(true)}
          >
            <Pencil />
            {t('orders.edit.action')}
          </Button>
        )}
        {order.type === 'DINE_IN' && mayEdit(permissions) && (
          <Button
            variant="outline"
            className="h-12 text-base"
            disabled={moveTo.isPending}
            onClick={() => setMoving(true)}
          >
            <ArrowRightLeft />
            {t('orders.moveTable')}
          </Button>
        )}
        {mayCancel(permissions, order) && (
          <Button
            variant="destructive"
            className="h-12 text-base"
            onClick={() => setCancelling(true)}
          >
            {t('orders.cancel')}
          </Button>
        )}
      </div>
      <PaymentDialog order={order} open={paying} onOpenChange={setPaying} />
      <OrderEditDialog order={order} open={editing} onOpenChange={setEditing} />
      <TablePicker
        open={moving}
        onOpenChange={setMoving}
        title={t('orders.moveTitle', { number: order.displayNumber })}
        disabledId={order.tableId}
        onSelect={(tableId) => {
          setMoving(false);
          moveTo.mutate(
            { id: order.id, data: { tableId } },
            {
              onSuccess: () =>
                celebrate(
                  t('orders.movedMessage', { number: order.displayNumber }),
                ),
            },
          );
        }}
      />
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={t('orders.cancelTitle', { number: order.displayNumber })}
        description={
          order.paidAmount > 0
            ? t('orders.cancelPaidWarning', {
                amount: formatMoney(order.paidAmount),
              })
            : undefined
        }
        confirmLabel={t('orders.cancel')}
        pending={cancel.isPending}
        error={cancel.error}
        onConfirm={() =>
          cancel.mutate(
            { id: order.id },
            { onSuccess: () => setCancelling(false) },
          )
        }
      />
    </div>
  );
}

function OrderBody({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const { placeOf } = useTables();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StatusBadge status={order.status} />
        <SourceBadge source={order.source} />
        <span>{placeOf(order)}</span>
        <span>· {t(`orders.source.${order.source}`)}</span>
        <span>· {formatDateTime(order.createdAt)}</span>
      </div>
      {(order.customerName || order.customerPhone) && (
        <p className="text-sm">
          {[order.customerName, order.customerPhone].filter(Boolean).join(', ')}
        </p>
      )}
      <ul className="divide-y rounded-lg border">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between gap-3 p-2.5 text-sm"
          >
            <span>
              {item.quantity} × {item.name}
              {item.note && (
                <span className="block text-xs text-muted-foreground">
                  {item.note}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">
              {formatMoney(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      {order.note && <p className="text-sm">{order.note}</p>}
      <OrderAmounts amounts={order} />
      <dl className="space-y-1 text-sm">
        {order.payments.map((payment) => (
          <div
            key={payment.id}
            className="flex justify-between text-muted-foreground"
          >
            <dt>{t(`orders.method.${payment.method}`)}</dt>
            <dd>{formatMoney(payment.amount)}</dd>
          </div>
        ))}
        {order.paidAmount > 0 && order.paidAmount < order.total && (
          <div className="flex justify-between font-medium">
            <dt>{t('orders.unpaid')}</dt>
            <dd>{formatMoney(order.total - order.paidAmount)}</dd>
          </div>
        )}
      </dl>
      {isInProgress(order.status) && (
        <OrderActions order={order} permissions={permissions} />
      )}
    </div>
  );
}

/** One order, kept current by the realtime events while it is open. */
export function OrderDialog({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const shownId = useHeldValue(orderId);
  const order = useOrdersControllerGet(shownId ?? '', {
    query: { enabled: shownId !== null },
  });

  return (
    <Dialog
      open={orderId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {order.data
              ? t('orders.title', { number: order.data.displayNumber })
              : t('common.loading')}
          </DialogTitle>
        </DialogHeader>
        {order.data ? (
          <OrderBody order={order.data} />
        ) : (
          <QueryState
            isPending={order.isPending}
            error={order.error}
            refetch={order.refetch}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
