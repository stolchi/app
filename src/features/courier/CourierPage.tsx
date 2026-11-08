import { useQueryClient } from '@tanstack/react-query';
import { Check, Navigation, Phone, Truck, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ApiError } from '@/shared/api/client';
import {
  useCourierOrdersControllerAvailable,
  useCourierOrdersControllerClaim,
  useCourierOrdersControllerDeliver,
  useCourierOrdersControllerMine,
  useCourierOrdersControllerPickUp,
  useCourierOrdersControllerRelease,
} from '@/shared/api/generated/courier/courier';
import type { OrderDto } from '@/shared/api/generated/model';
import { formatMoney, formatTime as formatClock } from '@/shared/lib/format';
import { mapLinks } from '@/shared/lib/geo';
import { quantityLabel } from '@/shared/lib/quantity';
import { playChime } from '@/shared/lib/chime';
import { useSocketEvent } from '@/shared/realtime/RealtimeProvider';
import { Page } from '@/shared/ui/Page';
import { SoundHint } from '@/shared/ui/SoundHint';

/** Minutes a courier can pick from as they leave. */
export const ETA_CHOICES = [15, 20, 30, 45, 60] as const;

type Stage = 'waiting' | 'ready' | 'onTheWay';

const stageOf = (order: OrderDto): Stage =>
  order.status === 'SERVED'
    ? 'onTheWay'
    : order.status === 'READY'
      ? 'ready'
      : 'waiting';

const big =
  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60';
const outline =
  'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card font-semibold outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-primary';

function useRefresh() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: ({ queryKey: [key] }) =>
        typeof key === 'string' && key.startsWith('/api/v1/courier'),
    });
}

function errorText(error: unknown, t: (key: string) => string) {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 409) {
    return t('courierPage.taken');
  }
  return t(
    error instanceof ApiError
      ? 'common.errors.generic'
      : 'common.errors.network',
  );
}

/** The panel's own dialog, kept to a title and what to choose. */
function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="space-y-4 sm:max-w-md">
        <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Who, where, what and how much: everything needed at the door. */
function OrderFacts({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const unpaid = order.total - order.paidAmount;
  const links = order.location && mapLinks(order.location);
  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-2xl font-extrabold">#{order.displayNumber}</h3>
        <span
          className={`rounded-xl px-3 py-1.5 text-right text-sm font-bold ${
            unpaid > 0
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {unpaid > 0
            ? `${t('courierPage.card.collect')}: ${formatMoney(unpaid)}`
            : t('courierPage.card.paid')}
        </span>
      </header>
      <div className="space-y-0.5">
        {order.customerName && (
          <p className="font-semibold">{order.customerName}</p>
        )}
        {order.address && <p>{order.address}</p>}
        {order.note && (
          <p className="text-sm font-medium text-primary">{order.note}</p>
        )}
      </div>
      <div className="flex gap-2">
        {order.customerPhone && (
          <a href={`tel:${order.customerPhone}`} className={outline}>
            <Phone className="size-5" />
            {t('courierPage.card.call')}
          </a>
        )}
        {links && (
          <a href={links.yandexNavigator} className={outline}>
            <Navigation className="size-5" />
            {t('courierPage.card.navigator')}
          </a>
        )}
      </div>
      {links ? (
        <p className="flex gap-4 text-sm">
          <a
            href={links.yandexMaps}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t('courierPage.card.yandex')}
          </a>
          <a
            href={links.google}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t('courierPage.card.google')}
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('courierPage.card.noPoint')}
        </p>
      )}
      <ul className="space-y-0.5 border-t border-border pt-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            <b>{quantityLabel(item.unit, item.quantity)}</b> {item.name}
          </li>
        ))}
      </ul>
    </>
  );
}

function AvailableCard({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const refresh = useRefresh();
  const [notice, setNotice] = useState<string | null>(null);
  const claim = useCourierOrdersControllerClaim({
    mutation: {
      onSuccess: () =>
        setNotice(
          t('courierPage.available.taken', { number: order.displayNumber }),
        ),
      onSettled: refresh,
    },
  });
  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <OrderFacts order={order} />
      <p className="text-sm font-medium text-muted-foreground">
        {t(`courierPage.status.${order.status}`)}
      </p>
      {claim.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorText(claim.error, t)}
        </p>
      ) : null}
      {notice && <p role="status">{notice}</p>}
      <button
        type="button"
        className={big}
        disabled={claim.isPending}
        onClick={() => claim.mutate({ id: order.id })}
      >
        <Truck className="size-5" />
        {t('courierPage.available.take')}
      </button>
    </article>
  );
}

function MineCard({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const refresh = useRefresh();
  const [choosingEta, setChoosingEta] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const stage = stageOf(order);
  const unpaid = order.total - order.paidAmount;
  const mutation = { mutation: { onSettled: refresh } };
  const release = useCourierOrdersControllerRelease(mutation);
  const pickUp = useCourierOrdersControllerPickUp({
    mutation: { onSuccess: () => setChoosingEta(false), onSettled: refresh },
  });
  const deliver = useCourierOrdersControllerDeliver({
    mutation: { onSuccess: () => setDelivering(false), onSettled: refresh },
  });
  const error = release.error ?? pickUp.error ?? deliver.error;

  return (
    <article
      className={`space-y-3 rounded-2xl border bg-card p-4 shadow-sm ${
        stage === 'ready' ? 'border-2 border-emerald-500' : 'border-border'
      }`}
    >
      <OrderFacts order={order} />
      {stage === 'onTheWay' && order.deliveryEta && (
        <p className="font-semibold">
          {t('courierPage.mine.eta', { time: formatClock(order.deliveryEta) })}
        </p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorText(error, t)}
        </p>
      ) : null}
      {stage === 'ready' && (
        <button
          type="button"
          className={big}
          onClick={() => setChoosingEta(true)}
        >
          <Truck className="size-5" />
          {t('courierPage.mine.pickUp')}
        </button>
      )}
      {stage === 'onTheWay' && (
        <button
          type="button"
          className={big}
          onClick={() => setDelivering(true)}
        >
          <Check className="size-5" />
          {t('courierPage.mine.deliver')}
        </button>
      )}
      {stage !== 'onTheWay' && (
        <button
          type="button"
          disabled={release.isPending}
          onClick={() => release.mutate({ id: order.id })}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted-foreground outline-none active:bg-muted"
        >
          <Undo2 className="size-4" />
          {t('courierPage.mine.release')}
        </button>
      )}

      <Sheet
        open={choosingEta}
        title={t('courierPage.pickUp.title', { number: order.displayNumber })}
        onClose={() => setChoosingEta(false)}
      >
        <p className="text-sm text-muted-foreground">
          {t('courierPage.pickUp.hint')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ETA_CHOICES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              disabled={pickUp.isPending}
              onClick={() =>
                pickUp.mutate({ id: order.id, data: { etaMinutes: minutes } })
              }
              className="h-14 rounded-2xl border border-border text-lg font-bold outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('courierPage.pickUp.minutes', { count: minutes })}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="h-12 w-full rounded-xl bg-muted font-semibold"
          onClick={() => setChoosingEta(false)}
        >
          {t('common.cancel')}
        </button>
      </Sheet>

      <Sheet
        open={delivering}
        title={t('courierPage.deliver.title', { number: order.displayNumber })}
        onClose={() => setDelivering(false)}
      >
        <p className="font-semibold">
          {unpaid > 0
            ? t('courierPage.deliver.collect', { amount: formatMoney(unpaid) })
            : t('courierPage.deliver.paid')}
        </p>
        {unpaid > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {(['CASH', 'CARD'] as const).map((method) => (
              <button
                key={method}
                type="button"
                disabled={deliver.isPending}
                onClick={() =>
                  deliver.mutate({ id: order.id, data: { method } })
                }
                className={big}
              >
                {t(
                  method === 'CASH'
                    ? 'courierPage.deliver.cash'
                    : 'courierPage.deliver.card',
                )}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            disabled={deliver.isPending}
            onClick={() =>
              deliver.mutate({ id: order.id, data: { method: 'CASH' } })
            }
            className={big}
          >
            {t('courierPage.deliver.confirm')}
          </button>
        )}
        <button
          type="button"
          className="h-12 w-full rounded-xl bg-muted font-semibold"
          onClick={() => setDelivering(false)}
        >
          {t('common.cancel')}
        </button>
      </Sheet>
    </article>
  );
}

const STAGES: readonly Stage[] = ['ready', 'onTheWay', 'waiting'];

/**
 * The cafe's own courier, on their phone: what they have, by what to do next, and the
 * cafe's deliveries free to take. Couriers from the network use the courier site.
 */
export function CourierPage() {
  const { t } = useTranslation();
  // Sockets are the main signal; this catches a phone that slept through one.
  const options = { query: { refetchInterval: 60_000 } };
  const mine = useCourierOrdersControllerMine(options);
  const available = useCourierOrdersControllerAvailable(options);
  const [tab, setTab] = useState<'mine' | 'available'>('mine');
  const mineCount = mine.data?.length ?? 0;
  const freeCount = available.data?.length ?? 0;

  const refresh = useRefresh();
  useSocketEvent('courier.changed', () => {
    playChime();
    void refresh();
  });

  // Nothing of one's own yet: the free ones are what matters.
  const shown =
    tab === 'mine' && mine.data?.length === 0 && freeCount > 0
      ? 'available'
      : tab;

  return (
    <Page title={t('courierPage.title')}>
      <div className="mx-auto max-w-2xl space-y-4 pb-10">
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
        >
          {(['mine', 'available'] as const).map((id) => {
            const count = id === 'mine' ? mineCount : freeCount;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={shown === id}
                onClick={() => setTab(id)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary aria-selected:bg-card aria-selected:shadow-sm"
              >
                {t(`courierPage.tabs.${id}`)}
                {count > 0 && (
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs ${
                      id === 'available'
                        ? 'animate-pulse bg-amber-400 text-amber-950 motion-reduce:animate-none'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {shown === 'available' ? (
          !available.data ? (
            <p className="p-6 text-center text-muted-foreground">
              {available.isError
                ? t('common.errors.network')
                : t('common.loading')}
            </p>
          ) : available.data.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">
              {t('courierPage.available.empty')}
            </p>
          ) : (
            <ul className="grid gap-3">
              {available.data.map((order) => (
                <li key={order.id}>
                  <AvailableCard order={order} />
                </li>
              ))}
            </ul>
          )
        ) : !mine.data ? (
          <p className="p-6 text-center text-muted-foreground">
            {mine.isError ? t('common.errors.network') : t('common.loading')}
          </p>
        ) : mine.data.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">
            {t('courierPage.mine.empty')}
          </p>
        ) : (
          STAGES.map((stage) => {
            const inStage = mine.data.filter(
              (order) => stageOf(order) === stage,
            );
            if (inStage.length === 0) return null;
            return (
              <section
                key={stage}
                aria-label={t(`courierPage.mine.groups.${stage}`)}
              >
                <h2 className="mb-2 font-bold">
                  {t(`courierPage.mine.groups.${stage}`)} ({inStage.length})
                </h2>
                <ul className="grid gap-3">
                  {inStage.map((order) => (
                    <li key={order.id}>
                      <MineCard order={order} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
      <SoundHint />
    </Page>
  );
}
