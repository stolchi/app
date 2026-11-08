import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { OrderDto } from '@/shared/api/generated/model';
import { isUnseen, useMarkSeen } from './unseen';

/** A pulsing "new" chip, for a customer's order nobody has opened yet. */
export function UnseenChip({
  order,
}: {
  order: Pick<OrderDto, 'seenAt' | 'status'>;
}) {
  const { t } = useTranslation();
  if (!isUnseen(order)) return null;
  return (
    <span className="relative inline-flex items-center rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950">
      <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-50 motion-reduce:hidden" />
      <span className="relative">{t('orders.unseen.badge')}</span>
    </span>
  );
}

/** "I have seen it", for when nothing else about the order needs doing yet. */
export function MarkSeenButton({
  order,
}: {
  order: Pick<OrderDto, 'id' | 'seenAt' | 'status'>;
}) {
  const { t } = useTranslation();
  const markSeen = useMarkSeen();
  if (!isUnseen(order)) return null;
  return (
    <Button
      variant="outline"
      className="h-11 border-amber-400 px-3"
      onClick={() => markSeen(order)}
    >
      <Eye />
      {t('orders.unseen.markSeen')}
    </Button>
  );
}

/** Classes that make an unseen order's card stand out. */
export const unseenCard =
  'border-2 border-amber-400 bg-amber-50 shadow-md shadow-amber-200';
