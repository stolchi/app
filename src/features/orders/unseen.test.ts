import type { OrderDto } from '@/shared/api/generated/model';
import { isUnseen, unseenCounts } from './unseen';

const order = (
  type: OrderDto['type'],
  seenAt: string | null,
  status: OrderDto['status'] = 'NEW',
) => ({ type, seenAt, status }) as OrderDto;

describe('unseen orders', () => {
  it('stays new until opened, and stops counting once finished', () => {
    expect(isUnseen(order('DELIVERY', null))).toBe(true);
    expect(isUnseen(order('DELIVERY', '2026-01-31T10:00:00Z'))).toBe(false);
    expect(isUnseen(order('DELIVERY', null, 'CANCELLED'))).toBe(false);
  });

  it('counts deliveries on their own page only when the cafe delivers', () => {
    const orders = [
      order('DELIVERY', null),
      order('DELIVERY', null),
      order('DINE_IN', null, 'ACCEPTED'),
      order('TAKEAWAY', '2026-01-31T10:00:00Z', 'ACCEPTED'),
    ];
    expect(unseenCounts(orders, true)).toEqual({
      '/delivery': 2,
      '/orders': 1,
    });
    expect(unseenCounts(orders, false)).toEqual({
      '/delivery': 0,
      '/orders': 3,
    });
  });
});
