import type { OrderDto, OrderStatus } from '@/shared/api/generated/model';

export type DeliveryGroup = 'waiting' | 'cooking' | 'ready' | 'onTheWay';

/** In the order a delivery goes through them, starting with what needs a phone call. */
export const DELIVERY_GROUPS: readonly {
  id: DeliveryGroup;
  statuses: readonly OrderStatus[];
}[] = [
  { id: 'waiting', statuses: ['NEW'] },
  { id: 'cooking', statuses: ['ACCEPTED', 'COOKING'] },
  { id: 'ready', statuses: ['READY'] },
  { id: 'onTheWay', statuses: ['SERVED'] },
];

/** Active deliveries by stage, oldest first, without empty stages. */
export function groupDeliveries(orders: readonly OrderDto[]) {
  const deliveries = orders.filter((order) => order.type === 'DELIVERY');
  return DELIVERY_GROUPS.map(({ id, statuses }) => ({
    id,
    orders: deliveries
      .filter((order) => statuses.includes(order.status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  })).filter((group) => group.orders.length > 0);
}

/** How long an order may wait for a call before the reminder sounds again. */
export const REMIND_AFTER_MINUTES = 5;

/** Orders still waiting for someone to call, past the reminder time. */
export const overdue = (orders: readonly OrderDto[], now: number) =>
  orders.filter(
    (order) =>
      order.type === 'DELIVERY' &&
      order.status === 'NEW' &&
      now - new Date(order.createdAt).getTime() >=
        REMIND_AFTER_MINUTES * 60_000,
  );
