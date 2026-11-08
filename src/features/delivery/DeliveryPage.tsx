import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, PhoneCall, Truck, UserPen, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CancelOrderDialog } from '@/features/orders/CancelOrderDialog';
import { ContactDialog } from '@/features/orders/ContactDialog';
import { CustomerDetails } from '@/features/orders/CustomerDetails';
import { OrderDialog } from '@/features/orders/OrderDialog';
import { OrderEditDialog } from '@/features/orders/OrderEditDialog';
import { ACTIVE_QUERY } from '@/features/orders/ActiveOrders';
import { elapsed } from '@/features/orders/active-groups';
import {
  mayCancel,
  mayEdit,
  maySetStatus,
} from '@/features/orders/order-rules';
import { useCafeFeatures } from '@/app/use-cafe-features';
import {
  useOrdersControllerChangeStatus,
  useOrdersControllerList,
} from '@/shared/api/generated/orders/orders';
import type { OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions } from '@/shared/auth/session-store';
import { playChime } from '@/shared/lib/chime';
import { formatMoney } from '@/shared/lib/format';
import { quantityLabel } from '@/shared/lib/quantity';
import { useMinutesSince } from '@/shared/lib/use-minutes-since';
import { SPRING } from '@/shared/motion/variants';
import { useSocketEvent } from '@/shared/realtime/RealtimeProvider';
import { celebrate } from '@/shared/ui/Celebration';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { SoundHint } from '@/shared/ui/SoundHint';
import {
  groupDeliveries,
  overdue,
  REMIND_AFTER_MINUTES,
  type DeliveryGroup,
} from './delivery-groups';

/** The one step each stage asks for, and the status it leads to. */
const NEXT: Partial<Record<DeliveryGroup, 'ACCEPTED' | 'SERVED'>> = {
  waiting: 'ACCEPTED',
  ready: 'SERVED',
};

function DeliveryCard({
  order,
  group,
  minutes,
  onOpen,
}: {
  order: OrderDto;
  group: DeliveryGroup;
  minutes: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [editing, setEditing] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const change = useOrdersControllerChangeStatus({
    mutation: {
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
    },
  });
  const waiting = group === 'waiting';
  const next = NEXT[group];
  const time = elapsed(minutes);

  return (
    <article
      className={cn(
        'space-y-3 rounded-2xl border bg-card p-4 shadow-xs',
        waiting && 'border-2 border-primary/60',
        waiting && minutes >= REMIND_AFTER_MINUTES && 'border-destructive',
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="font-heading text-2xl font-bold outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t('orders.active.open', { number: order.displayNumber })}
        >
          {t('orders.title', { number: order.displayNumber })}
        </button>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            waiting && minutes >= REMIND_AFTER_MINUTES
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {t(time.key, time.values)}
        </span>
      </header>
      <CustomerDetails order={order} />
      {waiting && (
        <ul className="space-y-0.5 text-sm">
          {order.items.map((item) => (
            <li key={item.id}>
              <span className="font-semibold">
                {quantityLabel(item.unit, item.quantity)}
              </span>{' '}
              {item.name}
              {item.note && (
                <span className="text-muted-foreground"> — {item.note}</span>
              )}
            </li>
          ))}
          {order.note && (
            <li className="pt-1 font-medium text-primary">{order.note}</li>
          )}
        </ul>
      )}
      <p className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">
          {t('orders.total')}
        </span>
        <span className="text-lg font-bold">{formatMoney(order.total)}</span>
      </p>
      <ErrorText error={change.error} />
      <div className="grid gap-2 sm:grid-cols-2">
        {waiting && order.customerPhone && (
          <a
            href={`tel:${order.customerPhone}`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-12 text-base',
            )}
          >
            <PhoneCall />
            {t('delivery.call')}
          </a>
        )}
        {next && maySetStatus(permissions, next) && (
          <Button
            className="h-12 text-base"
            disabled={change.isPending}
            onClick={() =>
              change.mutate(
                { id: order.id, data: { status: next } },
                {
                  onSuccess: () =>
                    celebrate(
                      t(`delivery.done.${next}`, {
                        number: order.displayNumber,
                      }),
                    ),
                },
              )
            }
          >
            {next === 'ACCEPTED' ? <Check /> : <Truck />}
            {t(`delivery.next.${next}`)}
          </Button>
        )}
        {group === 'onTheWay' && (
          <Button className="h-12 text-base" onClick={onOpen}>
            <Check />
            {t('delivery.delivered')}
          </Button>
        )}
      </div>
      {waiting && (
        <div className="flex flex-wrap gap-2">
          {mayEdit(permissions) && (
            <>
              <Button
                variant="outline"
                className="h-11 px-3"
                onClick={() => setEditing(true)}
              >
                <Pencil />
                {t('delivery.changeItems')}
              </Button>
              <Button
                variant="outline"
                className="h-11 px-3"
                onClick={() => setEditingContact(true)}
              >
                <UserPen />
                {t('delivery.contact')}
              </Button>
            </>
          )}
          {mayCancel(permissions, order) && (
            <Button
              variant="ghost"
              className="h-11 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelling(true)}
            >
              <X />
              {t('orders.cancel')}
            </Button>
          )}
        </div>
      )}
      <OrderEditDialog order={order} open={editing} onOpenChange={setEditing} />
      <ContactDialog
        order={order}
        open={editingContact}
        onOpenChange={setEditingContact}
      />
      <CancelOrderDialog
        order={order}
        open={cancelling}
        onOpenChange={setCancelling}
      />
    </article>
  );
}

/** Rings again while a delivery has waited too long for someone to call. */
function useReminder(orders: readonly OrderDto[] | undefined) {
  const lastRing = useRef(0);
  const latest = useRef(orders);
  useEffect(() => {
    latest.current = orders;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (
        overdue(latest.current ?? [], now).length > 0 &&
        now - lastRing.current >= REMIND_AFTER_MINUTES * 60_000
      ) {
        lastRing.current = now;
        playChime();
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, []);
}

export function DeliveryPage() {
  const { t } = useTranslation();
  const features = useCafeFeatures();
  const orders = useOrdersControllerList(ACTIVE_QUERY);
  const minutesSince = useMinutesSince();
  const [openId, setOpenId] = useState<string | null>(null);
  useReminder(orders.data?.items);

  // Every new delivery waiting for a call rings at once, wherever the page is scrolled.
  useSocketEvent<OrderDto>('order.created', (order) => {
    if (order.type === 'DELIVERY' && order.status === 'NEW') playChime();
  });

  if (!features.delivery) {
    return (
      <Page title={t('nav.delivery')}>
        <EmptyState icon={Truck}>
          {t('delivery.turnedOff')}{' '}
          <Link to="/settings" className="font-medium text-primary underline">
            {t('nav.settings')}
          </Link>
        </EmptyState>
      </Page>
    );
  }

  const groups = orders.data ? groupDeliveries(orders.data.items) : [];

  return (
    <Page title={t('nav.delivery')}>
      {!orders.data ? (
        <QueryState
          isPending={orders.isPending}
          error={orders.error}
          refetch={orders.refetch}
        />
      ) : groups.length === 0 ? (
        <EmptyState icon={Truck}>{t('delivery.empty')}</EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-label={t(`delivery.groups.${group.id}`)}
            >
              <h2 className="mb-2 flex items-center gap-2 font-bold">
                {t(`delivery.groups.${group.id}`)}
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs',
                    group.id === 'waiting'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}
                >
                  {group.orders.length}
                </span>
              </h2>
              {group.id === 'waiting' && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {t('delivery.waitingHint')}
                </p>
              )}
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {group.orders.map((order) => (
                    <motion.li
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={SPRING}
                    >
                      <DeliveryCard
                        order={order}
                        group={group.id}
                        minutes={minutesSince(order.createdAt)}
                        onOpen={() => setOpenId(order.id)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
      <SoundHint />
      <OrderDialog orderId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
