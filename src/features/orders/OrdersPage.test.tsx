import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Permission } from '@/shared/api/generated/model';
import { useSessionStore } from '@/shared/auth/session-store';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { OrdersPage } from './OrdersPage';

const order = (id: string, number: number, status: string, paidAmount = 0) => ({
  id,
  number,
  displayNumber: String(number),
  businessDate: '2026-01-31',
  status,
  source: 'POS',
  type: 'TAKEAWAY',
  tableId: null,
  customerName: null,
  customerPhone: null,
  total: 1000,
  paidAmount,
  note: null,
  createdById: null,
  publicToken: 't',
  createdAt: '2026-01-31T10:00:00Z',
  items: [
    {
      id: `${id}-i`,
      productId: 'p',
      name: 'Osh',
      price: 500,
      quantity: 2,
      note: null,
      addedQuantity: 0,
      unit: 'PIECE',
      weighed: true,
      sendsToKitchen: true,
    },
  ],
  payments: [],
  seenAt: '2026-01-31T10:00:00Z',
});

const ACTIVE = [
  order('a', 1, 'COOKING'),
  order('b', 2, 'READY'),
  order('c', 3, 'SERVED', 1000),
];

function show(permissions: Permission[]) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input);
      calls.push(url.pathname + url.search);
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      if (url.pathname.endsWith('/tables')) return json([]);
      const items =
        url.searchParams.get('active') === 'true'
          ? ACTIVE
          : [order('z', 9, 'PAID', 1000)];
      return json({ items, total: items.length, page: 1, limit: 25 });
    }),
  );
  useSessionStore.setState({
    status: 'authenticated',
    accessToken: 't',
    user: {
      id: 'u',
      cafeId: 'c',
      name: 'A',
      phone: '+998900000000',
      isSuperAdmin: false,
      role: null,
      permissions,
    },
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrdersPage />
    </QueryClientProvider>,
  );
  return calls;
}

const group = (name: string) => screen.findByRole('region', { name });

describe('OrdersPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens on what needs doing, grouped, with what was ordered', async () => {
    show(Object.values(Permission));
    const finish = await group(uz.orders.active.groups.finish);
    expect(within(finish).getByText('#2')).toBeInTheDocument();
    expect(within(finish).getByText('#3')).toBeInTheDocument();
    expect(within(finish).getAllByText('2 × Osh')).toHaveLength(2);

    const kitchen = await group(uz.orders.active.groups.kitchen);
    expect(within(kitchen).getByText('#1')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: uz.orders.active.groups.confirm }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: `${uz.orders.tabs.active} (3)` }),
    ).toBeInTheDocument();
  });

  it('offers the job at hand: payment when owed, closing when paid', async () => {
    show(Object.values(Permission));
    const finish = await group(uz.orders.active.groups.finish);
    const [ready, served] = within(finish).getAllByRole('article');
    expect(
      within(ready).getByRole('button', { name: uz.orders.active.pay }),
    ).toBeInTheDocument();
    expect(
      within(served).getByRole('button', { name: uz.orders.close }),
    ).toBeInTheDocument();
    expect(
      within(served).queryByRole('button', { name: uz.orders.active.pay }),
    ).toBeNull();
    expect(within(served).getByText(uz.orders.active.paid)).toBeInTheDocument();
  });

  it('shows a waiter the orders, but no money or kitchen buttons', async () => {
    show([Permission.ORDERS_VIEW, Permission.ORDERS_CREATE]);
    const finish = await group(uz.orders.active.groups.finish);
    const [ready] = within(finish).getAllByRole('article');
    expect(within(ready).getAllByRole('button')).toHaveLength(1);
  });

  it('keeps finished orders in the history tab', async () => {
    const calls = show(Object.values(Permission));
    await group(uz.orders.active.groups.finish);
    await userEvent.click(
      screen.getByRole('button', { name: uz.orders.tabs.history }),
    );
    await waitFor(() =>
      expect(calls.some((call) => call.includes('active=false'))).toBe(true),
    );
    expect((await screen.findAllByText('#9')).length).toBeGreaterThan(0);
  });
});
