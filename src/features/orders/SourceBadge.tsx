import { QrCode, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { OrderSource } from '@/shared/api/generated/model';

const STYLES = {
  QR: { color: 'bg-indigo-100 text-indigo-800', icon: QrCode },
  TELEGRAM: { color: 'bg-sky-100 text-sky-800', icon: Send },
};

/** Marks an order the customer placed themselves. Staff orders need no mark. */
export function SourceBadge({ source }: { source: OrderSource }) {
  const { t } = useTranslation();
  if (source === 'POS') return null;
  const { color, icon: Icon } = STYLES[source];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        color,
      )}
    >
      <Icon className="size-3" />
      {t(`orders.source.${source}`)}
    </span>
  );
}
