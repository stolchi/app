import { useQueryClient } from '@tanstack/react-query';
import { HandCoins, Phone, Search, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DeliveryMode, OrderDto } from '@/shared/api/generated/model';
import {
  useOrdersControllerHandOver,
  useOrdersControllerOffer,
} from '@/shared/api/generated/orders/orders';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { formatMoney, formatTime as formatClock } from '@/shared/lib/format';
import { celebrate } from '@/shared/ui/Celebration';
import { ErrorText } from '@/shared/ui/ErrorText';

/**
 * Money between the cafe and a Stolchi courier when the food leaves, mirroring the
 * API's `networkMoney`: the courier collects what is still owed and keeps the fee.
 * Above 0 the courier pays the cafe now; below 0 the cafe pays the courier.
 */
export function handOverSettlement(order: OrderDto): number {
  return Math.max(0, order.total - order.paidAmount) - order.deliveryFee;
}

const useRefresh = () => {
  const queryClient = useQueryClient();
  return () => invalidate(queryClient, ApiPath.orders, ApiPath.dashboard);
};

/** "Find a taxi" and its withdrawal: only a cafe with both kinds of courier chooses. */
export function OfferButton({
  order,
  mode,
}: {
  order: OrderDto;
  mode: DeliveryMode | undefined;
}) {
  const { t } = useTranslation();
  const refresh = useRefresh();
  const offer = useOrdersControllerOffer({
    mutation: { onSettled: refresh },
  });
  if (mode !== 'BOTH' || order.networkCourier || order.courier) return null;
  const offered = order.offeredAt !== null;
  return (
    <div className="space-y-1">
      <Button
        variant={offered ? 'ghost' : 'outline'}
        className="h-11 w-full"
        disabled={offer.isPending}
        onClick={() =>
          offer.mutate({ id: order.id, data: { offered: !offered } })
        }
      >
        {offered ? <Undo2 /> : <Search />}
        {t(offered ? 'network.withdraw' : 'network.offer')}
      </Button>
      <ErrorText error={offer.error} />
    </div>
  );
}

/** Where a delivery stands with Stolchi's couriers: looked for, or who took it. */
export function NetworkState({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const courier = order.networkCourier;
  if (courier) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-violet-50 p-2.5 text-sm text-violet-950">
        <span>
          <span className="block font-semibold">
            {t('network.taken', { name: courier.name })}
          </span>
          <span className="block text-violet-900/80">
            {t(`network.vehicle.${courier.vehicle}`)}
            {order.deliveryEta &&
              ` · ${t('network.arrives', { time: formatClock(order.deliveryEta) })}`}
          </span>
        </span>
        <a
          href={`tel:${courier.phone}`}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-white px-3 font-semibold"
        >
          <Phone className="size-4" />
          {courier.phone}
        </a>
      </div>
    );
  }
  if (order.offeredAt) {
    return (
      <p className="animate-pulse rounded-xl bg-violet-50 p-2.5 text-sm font-semibold text-violet-900 motion-reduce:animate-none">
        {t('network.searching')}
      </p>
    );
  }
  return null;
}

/** Ready food given to a Stolchi courier, with the money settled on the spot. */
export function HandOverButton({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const handOver = useOrdersControllerHandOver({
    mutation: { onSettled: refresh },
  });
  const settlement = handOverSettlement(order);
  const name = order.networkCourier?.name ?? '';
  return (
    <>
      <Button className="h-12 text-base" onClick={() => setOpen(true)}>
        <HandCoins />
        {t('network.handOver')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('network.handOverTitle', {
                number: order.displayNumber,
                name,
              })}
            </DialogTitle>
            <DialogDescription>
              {t('network.collect', {
                name,
                amount: formatMoney(
                  Math.max(0, order.total - order.paidAmount),
                ),
              })}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-xl bg-muted p-3 text-lg font-bold">
            {settlement > 0
              ? t('network.courierPays', {
                  name,
                  amount: formatMoney(settlement),
                })
              : settlement < 0
                ? t('network.cafePays', {
                    name,
                    amount: formatMoney(-settlement),
                  })
                : t('network.even')}
          </p>
          <ErrorText error={handOver.error} />
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="h-11"
              disabled={handOver.isPending}
              onClick={() =>
                handOver.mutate(
                  { id: order.id },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      celebrate(
                        t('network.handedOver', {
                          number: order.displayNumber,
                        }),
                      );
                    },
                  },
                )
              }
            >
              {t('network.confirmHandOver')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
