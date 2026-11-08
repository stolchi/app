import type { OrderDto } from '@/shared/api/generated/model';
import { groupDeliveries, overdue } from './delivery-groups';

const order = (
  id: string,
  status: OrderDto['status'],
  createdAt: string,
  type: OrderDto['type'] = 'DELIVERY',
) => ({ id, status, createdAt, type }) as OrderDto;

describe('delivery groups', () => {
  it('sorts deliveries into stages, oldest first, and leaves others out', () => {
    const groups = groupDeliveries([
      order('b', 'NEW', '2026-01-31T10:05:00Z'),
      order('a', 'NEW', '2026-01-31T10:00:00Z'),
      order('c', 'COOKING', '2026-01-31T10:00:00Z'),
      order('d', 'SERVED', '2026-01-31T10:00:00Z'),
      order('x', 'NEW', '2026-01-31T09:00:00Z', 'TAKEAWAY'),
    ]);
    expect(groups.map((g) => [g.id, g.orders.map((o) => o.id)])).toEqual([
      ['waiting', ['a', 'b']],
      ['cooking', ['c']],
      ['onTheWay', ['d']],
    ]);
  });

  it('finds orders left waiting for a call for five minutes', () => {
    const now = new Date('2026-01-31T10:10:00Z').getTime();
    expect(
      overdue(
        [
          order('old', 'NEW', '2026-01-31T10:05:00Z'),
          order('fresh', 'NEW', '2026-01-31T10:06:00Z'),
          order('accepted', 'ACCEPTED', '2026-01-31T09:00:00Z'),
        ],
        now,
      ).map((o) => o.id),
    ).toEqual(['old']);
  });
});
