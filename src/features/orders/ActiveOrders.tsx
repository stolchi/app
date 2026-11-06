import { ClipboardList } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useOrdersControllerList } from '@/shared/api/generated/orders/orders';
import { useMinutesSince } from '@/shared/lib/use-minutes-since';
import { SPRING } from '@/shared/motion/variants';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { groupActiveOrders } from './active-groups';
import { ActiveOrderCard } from './ActiveOrderCard';
import { useTables } from './use-tables';

export const ACTIVE_QUERY = { active: true, limit: 100 } as const;

/** Orders still open, sorted by what they need from someone right now. */
export function ActiveOrders({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const { placeOf } = useTables();
  const orders = useOrdersControllerList(ACTIVE_QUERY);
  const minutesSince = useMinutesSince();

  if (!orders.data) {
    return (
      <QueryState
        isPending={orders.isPending}
        error={orders.error}
        refetch={orders.refetch}
      />
    );
  }
  if (orders.data.items.length === 0) {
    return (
      <EmptyState icon={ClipboardList}>{t('orders.active.empty')}</EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {groupActiveOrders(orders.data.items).map((group) => (
        <section
          key={group.id}
          aria-label={t(`orders.active.groups.${group.id}`)}
        >
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            {t(`orders.active.groups.${group.id}`)}
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
              {group.orders.length}
            </span>
          </h2>
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
                  <ActiveOrderCard
                    order={order}
                    place={placeOf(order)}
                    minutes={minutesSince(order.createdAt)}
                    onOpen={() => onOpen(order.id)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
}
