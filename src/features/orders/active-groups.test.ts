import type { OrderDto, OrderStatus } from '@/shared/api/generated/model';
import { elapsed, groupActiveOrders } from './active-groups';

const order = (id: string, status: OrderStatus, createdAt = '2026-01-01') =>
  ({ id, status, createdAt }) as OrderDto;

describe('groupActiveOrders', () => {
  it('puts what needs a person first, and leaves out empty groups', () => {
    const groups = groupActiveOrders([
      order('a', 'COOKING'),
      order('b', 'SERVED'),
      order('c', 'NEW'),
      order('d', 'READY'),
      order('e', 'ACCEPTED'),
    ]);
    expect(
      groups.map(({ id, orders }) => [id, orders.map((o) => o.id).sort()]),
    ).toEqual([
      ['confirm', ['c']],
      ['finish', ['b', 'd']],
      ['kitchen', ['a', 'e']],
    ]);
    expect(groupActiveOrders([order('a', 'COOKING')])).toHaveLength(1);
  });

  it('shows whoever has waited longest first', () => {
    const [{ orders }] = groupActiveOrders([
      order('new', 'READY', '2026-01-02'),
      order('old', 'READY', '2026-01-01'),
    ]);
    expect(orders.map((o) => o.id)).toEqual(['old', 'new']);
  });
});

describe('elapsed', () => {
  it('moves from minutes to hours to days', () => {
    expect(elapsed(59).values).toEqual({ minutes: 59 });
    expect(elapsed(125).values).toEqual({ hours: 2 });
    expect(elapsed(3000).values).toEqual({ days: 2 });
  });
});
