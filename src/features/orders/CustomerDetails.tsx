import { MapPin, Navigation, Phone, QrCode, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants, Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderDto } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/format';
import { mapLinks } from '@/shared/lib/geo';
import { celebrate } from '@/shared/ui/Celebration';
import { CourierQrDialog } from './CourierQrDialog';

type Details = Pick<
  OrderDto,
  | 'displayNumber'
  | 'customerName'
  | 'customerPhone'
  | 'address'
  | 'location'
  | 'total'
  | 'paidAmount'
>;

/** What a courier needs, as one message: who, where, how much, and the route. */
export function courierText(order: Details, t: (key: string) => string) {
  const unpaid = order.total - order.paidAmount;
  return [
    `#${order.displayNumber}`,
    [order.customerName, order.customerPhone].filter(Boolean).join(', '),
    order.address,
    unpaid > 0 ? `${t('orders.unpaid')}: ${formatMoney(unpaid)}` : null,
    order.location ? mapLinks(order.location).yandexMaps : null,
  ]
    .filter(Boolean)
    .join('\n');
}

const smallLink = cn(buttonVariants({ variant: 'outline' }), 'h-11 px-3');

/** Who the order is for, with a number to tap and call and a route for the courier. */
export function CustomerDetails({ order }: { order: Details }) {
  const { t } = useTranslation();
  const [showingQr, setShowingQr] = useState(false);
  if (
    !order.customerName &&
    !order.customerPhone &&
    !order.address &&
    !order.location
  ) {
    return null;
  }
  const links = order.location && mapLinks(order.location);

  const share = async () => {
    const text = courierText(order, t);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Closed without sharing, or not allowed here: copying still helps.
      }
    }
    await navigator.clipboard?.writeText(text);
    celebrate(t('location.copied'));
  };

  return (
    <div className="space-y-1.5 rounded-xl bg-muted/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {order.customerName && (
          <span className="font-semibold">{order.customerName}</span>
        )}
        {order.customerPhone && (
          <a
            href={`tel:${order.customerPhone}`}
            aria-label={`${t('delivery.call')}: ${order.customerPhone}`}
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
          >
            <Phone className="size-4" />
            {order.customerPhone}
          </a>
        )}
      </div>
      {order.address && (
        <p className="flex gap-1.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="break-words">{order.address}</span>
        </p>
      )}
      {links && (
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={links.yandexMaps}
            target="_blank"
            rel="noreferrer"
            className={smallLink}
          >
            <MapPin />
            {t('location.yandexMaps')}
          </a>
          <a href={links.yandexNavigator} className={smallLink}>
            <Navigation />
            {t('location.yandexNavigator')}
          </a>
          <a
            href={links.google}
            target="_blank"
            rel="noreferrer"
            className={smallLink}
          >
            {t('location.google')}
          </a>
          <Button
            variant="outline"
            className="h-11 px-3"
            onClick={() => setShowingQr(true)}
          >
            <QrCode />
            {t('location.qr')}
          </Button>
        </div>
      )}
      {order.address && (
        <Button
          variant="ghost"
          className="h-11 px-2 text-primary"
          onClick={() => void share()}
        >
          <Send />
          {t('location.share')}
        </Button>
      )}
      {links && (
        <CourierQrDialog
          open={showingQr}
          onOpenChange={setShowingQr}
          number={order.displayNumber}
          url={links.yandexMaps}
        />
      )}
    </div>
  );
}
