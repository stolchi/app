import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Pencil, UserPen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useOrdersControllerChangeStatus,
  useOrdersControllerClose,
  useOrdersControllerGet,
  useOrdersControllerMoveToTable,
} from '@/shared/api/generated/orders/orders';
import type { OrderDto, Permission } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions } from '@/shared/auth/session-store';
import { lineTotal, quantityLabel } from '@/shared/lib/quantity';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { useHeldValue } from '@/shared/lib/use-held-value';
import { celebrate } from '@/shared/ui/Celebration';
import { ErrorText } from '@/shared/ui/ErrorText';
import { QueryState } from '@/shared/ui/QueryState';
import {
  isInProgress,
  mayCancel,
  mayEdit,
  maySetStatus,
  mayTakePayment,
  advanceLabel,
  nextStatus,
} from './order-rules';
import { CancelOrderDialog } from './CancelOrderDialog';
import { ContactDialog } from './ContactDialog';
import { CustomerDetails } from './CustomerDetails';
import { OrderAmounts } from './OrderAmounts';
import { useMarkSeen } from './unseen';
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
  const [editingContact, setEditingContact] = useState(false);

  // On failure too: a conflict means this screen is behind someone else's change.
  const mutation = {
    mutation: {
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
    },
  };
  const changeStatus = useOrdersControllerChangeStatus(mutation);
  const close = useOrdersControllerClose(mutation);
  const moveTo = useOrdersControllerMoveToTable(mutation);

  const unpaid = order.total - order.paidAmount;
  // A guessed weight is not a price yet.
  const unweighed = order.items.some((item) => !item.weighed);
  const next = nextStatus(order.status);
  const busy = changeStatus.isPending || close.isPending;

  return (
    <div className="space-y-2">
      <ErrorText error={changeStatus.error ?? close.error ?? moveTo.error} />
      {unweighed && mayTakePayment(permissions) && (
        <p
          role="status"
          className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900"
        >
          {t('weight.mustWeigh')}
        </p>
      )}
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
            {t(advanceLabel(order.type, next))}
          </Button>
        )}
        {mayTakePayment(permissions) && unpaid > 0 && (
          <Button
            className="h-12 text-base"
            disabled={unweighed}
            onClick={() => setPaying(true)}
          >
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
        {mayEdit(permissions) && (
          <Button
            variant="outline"
            className="h-12 text-base"
            onClick={() => setEditingContact(true)}
          >
            <UserPen />
            {t('delivery.contact')}
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
      <CancelOrderDialog
        order={order}
        open={cancelling}
        onOpenChange={setCancelling}
      />
      <ContactDialog
        order={order}
        open={editingContact}
        onOpenChange={setEditingContact}
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
        <StatusBadge status={order.status} type={order.type} />
        <SourceBadge source={order.source} />
        <span>{placeOf(order)}</span>
        <span>· {t(`orders.source.${order.source}`)}</span>
        <span>· {formatDateTime(order.createdAt)}</span>
      </div>
      <CustomerDetails order={order} />
      {order.status === 'CANCELLED' && order.cancelReason && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {t('orders.cancelledBecause', { reason: order.cancelReason })}
        </p>
      )}
      <ul className="divide-y rounded-lg border">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between gap-3 p-2.5 text-sm"
          >
            <span>
              {quantityLabel(item.unit, item.quantity)} {item.name}
              {!item.weighed && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  {t('weight.notWeighed')}
                </span>
              )}
              {item.note && (
                <span className="block text-xs text-muted-foreground">
                  {item.note}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">
              {formatMoney(lineTotal(item))}
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
  const markSeen = useMarkSeen();
  // Opening a customer's order is seeing it, for everyone at the cafe.
  const loaded = orderId !== null ? order.data : undefined;
  useEffect(() => {
    if (loaded) markSeen(loaded);
  }, [loaded, markSeen]);

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
