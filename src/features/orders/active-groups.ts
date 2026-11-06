import type { OrderDto, OrderStatus } from '@/shared/api/generated/model';

export type ActiveGroup = 'confirm' | 'finish' | 'kitchen';

/** Most urgent first. Each is a job for a person, not a step in the flow. */
export const ACTIVE_GROUPS: readonly {
  id: ActiveGroup;
  statuses: readonly OrderStatus[];
}[] = [
  { id: 'confirm', statuses: ['NEW'] },
  { id: 'finish', statuses: ['READY', 'SERVED'] },
  { id: 'kitchen', statuses: ['ACCEPTED', 'COOKING'] },
];

/** Groups in order, without empty ones, and whoever has waited longest first. */
export function groupActiveOrders(orders: readonly OrderDto[]) {
  return ACTIVE_GROUPS.map(({ id, statuses }) => ({
    id,
    orders: orders
      .filter((order) => statuses.includes(order.status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  })).filter((group) => group.orders.length > 0);
}

/** Past an hour, minutes stop being readable. */
export function elapsed(minutes: number) {
  if (minutes < 60) return { key: 'kitchen.minutes', values: { minutes } };
  if (minutes < 24 * 60) {
    return {
      key: 'orders.active.hours',
      values: { hours: Math.floor(minutes / 60) },
    };
  }
  return {
    key: 'orders.active.days',
    values: { days: Math.floor(minutes / (24 * 60)) },
  };
}
