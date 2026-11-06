import { OrderStatus, Permission } from '@/shared/api/generated/model';
import {
  isInProgress,
  mayCancel,
  maySetStatus,
  nextStatus,
  stepsTo,
} from './order-rules';

describe('order rules', () => {
  it('walks the status flow and stops at the end', () => {
    expect(nextStatus('NEW')).toBe('ACCEPTED');
    expect(nextStatus('SERVED')).toBe('PAID');
    expect(nextStatus('PAID')).toBeNull();
    expect(nextStatus('CANCELLED')).toBeNull();
  });

  it('lists each step needed to reach a status', () => {
    expect(stepsTo('NEW', 'COOKING')).toEqual(['ACCEPTED', 'COOKING']);
    expect(stepsTo('ACCEPTED', 'COOKING')).toEqual(['COOKING']);
  });

  it('never goes backwards or out of a cancelled order', () => {
    expect(stepsTo('READY', 'COOKING')).toEqual([]);
    expect(stepsTo('COOKING', 'COOKING')).toEqual([]);
    expect(stepsTo('CANCELLED', 'READY')).toEqual([]);
  });

  it('matches what the backend asks for each status', () => {
    const { KITCHEN_WORK, ORDERS_SERVE, ORDERS_PAYMENT } = Permission;
    expect(maySetStatus([KITCHEN_WORK], 'READY')).toBe(true);
    expect(maySetStatus([KITCHEN_WORK], 'SERVED')).toBe(false);
    expect(maySetStatus([ORDERS_SERVE], 'SERVED')).toBe(true);
    expect(maySetStatus([ORDERS_SERVE], 'COOKING')).toBe(false);
    expect(maySetStatus([ORDERS_PAYMENT], 'PAID')).toBe(true);
    expect(maySetStatus(Object.values(Permission), 'NEW')).toBe(false);
    expect(maySetStatus([], 'READY')).toBe(false);
  });

  it('lets only someone who handles money cancel a paid order', () => {
    const { ORDERS_CANCEL, ORDERS_PAYMENT } = Permission;
    expect(mayCancel([ORDERS_CANCEL], { paidAmount: 0 })).toBe(true);
    expect(mayCancel([ORDERS_CANCEL], { paidAmount: 100 })).toBe(false);
    expect(
      mayCancel([ORDERS_CANCEL, ORDERS_PAYMENT], { paidAmount: 100 }),
    ).toBe(true);
    expect(mayCancel([], { paidAmount: 0 })).toBe(false);
  });

  it('knows which orders are finished', () => {
    const open = Object.values(OrderStatus).filter(isInProgress);
    expect(open).toEqual(['NEW', 'ACCEPTED', 'COOKING', 'READY', 'SERVED']);
  });
});
