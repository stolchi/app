import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useCafeFeatures } from '@/app/use-cafe-features';
import {
  useOrdersControllerList,
  useOrdersControllerMarkSeen,
} from '@/shared/api/generated/orders/orders';
import { Permission, type OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions } from '@/shared/auth/session-store';
import { playChime } from '@/shared/lib/chime';

/** Every open order: the same query, and so the same cache, as the order pages. */
export const ACTIVE_QUERY = { active: true, limit: 100 } as const;

/** How often the reminder sounds while a customer's order has not been looked at. */
export const UNSEEN_REMINDER_MS = 2 * 60 * 1000;

const OVER = new Set<OrderDto['status']>(['PAID', 'CANCELLED']);

/** A customer's order nobody at the cafe has opened yet. */
export const isUnseen = (order: Pick<OrderDto, 'seenAt' | 'status'>) =>
  !order.seenAt && !OVER.has(order.status);

/**
 * How many unseen orders each page holds: deliveries on their own page when the cafe
 * delivers, everything else under Orders.
 */
export function unseenCounts(
  orders: readonly OrderDto[],
  delivery: boolean,
): { '/delivery': number; '/orders': number } {
  const unseen = orders.filter(isUnseen);
  const onDeliveryPage = (order: OrderDto) =>
    delivery && order.type === 'DELIVERY';
  return {
    '/delivery': unseen.filter(onDeliveryPage).length,
    '/orders': unseen.filter((order) => !onDeliveryPage(order)).length,
  };
}

/** Unseen orders by page, for the menu; it rings again while any stay unseen. */
export function useUnseenOrders() {
  const permissions = usePermissions();
  const features = useCafeFeatures();
  const watches = permissions.includes(Permission.ORDERS_VIEW);
  const orders = useOrdersControllerList(ACTIVE_QUERY, {
    query: { enabled: watches },
  });
  const counts = unseenCounts(
    watches ? (orders.data?.items ?? []) : [],
    features.delivery,
  );
  const waiting = counts['/delivery'] + counts['/orders'];

  const latest = useRef(waiting);
  useEffect(() => {
    latest.current = waiting;
  });
  useEffect(() => {
    if (!watches) return;
    const timer = setInterval(() => {
      if (latest.current > 0) playChime();
    }, UNSEEN_REMINDER_MS);
    return () => clearInterval(timer);
  }, [watches]);

  return counts;
}

/** Marks an order as looked at, for everyone at the cafe. */
export function useMarkSeen() {
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const mark = useOrdersControllerMarkSeen({
    mutation: { onSettled: () => invalidate(queryClient, ApiPath.orders) },
  });
  return (order: Pick<OrderDto, 'id' | 'seenAt' | 'status'>) => {
    if (
      isUnseen(order) &&
      permissions.includes(Permission.ORDERS_VIEW) &&
      !mark.isPending
    ) {
      mark.mutate({ id: order.id });
    }
  };
}
