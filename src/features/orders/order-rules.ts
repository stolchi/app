import {
  OrderStatus,
  Permission,
  type OrderDto,
} from '@/shared/api/generated/model';

const { NEW, ACCEPTED, COOKING, READY, SERVED, PAID, CANCELLED } = OrderStatus;

type Permissions = readonly Permission[];

const FLOW: readonly OrderStatus[] = [
  NEW,
  ACCEPTED,
  COOKING,
  READY,
  SERVED,
  PAID,
];

/** The permission needed for each status. Mirrors the backend, which has the final say. */
const REQUIRED: Partial<Record<OrderStatus, Permission>> = {
  [ACCEPTED]: Permission.KITCHEN_WORK,
  [COOKING]: Permission.KITCHEN_WORK,
  [READY]: Permission.KITCHEN_WORK,
  [SERVED]: Permission.ORDERS_SERVE,
  [PAID]: Permission.ORDERS_PAYMENT,
  [CANCELLED]: Permission.ORDERS_CANCEL,
};

export const maySetStatus = (permissions: Permissions, status: OrderStatus) => {
  const required = REQUIRED[status];
  return required !== undefined && permissions.includes(required);
};

export const nextStatus = (status: OrderStatus): OrderStatus | null => {
  const index = FLOW.indexOf(status);
  return index === -1 ? null : (FLOW[index + 1] ?? null);
};

/** The statuses to go through, in order, because the backend moves one step at a time. */
export function stepsTo(from: OrderStatus, to: OrderStatus): OrderStatus[] {
  const start = FLOW.indexOf(from);
  const end = FLOW.indexOf(to);
  return start === -1 || end <= start ? [] : FLOW.slice(start + 1, end + 1);
}

export const isInProgress = (status: OrderStatus) =>
  status !== PAID && status !== CANCELLED;

export const mayTakePayment = (permissions: Permissions) =>
  permissions.includes(Permission.ORDERS_PAYMENT);

export const mayEdit = (permissions: Permissions) =>
  permissions.includes(Permission.ORDERS_EDIT);

/** Money already taken is only for someone who handles money to undo. */
export const mayCancel = (
  permissions: Permissions,
  order: Pick<OrderDto, 'paidAmount'>,
) =>
  permissions.includes(Permission.ORDERS_CANCEL) &&
  (order.paidAmount === 0 || mayTakePayment(permissions));

/** Food added from here on goes back to the kitchen. */
export const isStarted = (status: OrderStatus) =>
  status === COOKING || status === READY || status === SERVED;

/** The button that moves an order on. A delivery is not served: it is handed to a courier. */
export const advanceLabel = (
  type: OrderDto['type'],
  status: OrderStatus,
): string =>
  type === 'DELIVERY' && status === SERVED
    ? 'orders.deliveryAdvance.SERVED'
    : `orders.advance.${status}`;
