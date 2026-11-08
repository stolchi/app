import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Permission } from '@/shared/api/generated/model';
import { useSessionStore } from '@/shared/auth/session-store';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { DeliveryPage } from './DeliveryPage';

const delivery = (id: string, number: number, status: string) => ({
  id,
  number,
  displayNumber: `D-${number}`,
  businessDate: '2026-01-31',
  status,
  source: 'TELEGRAM',
  type: 'DELIVERY',
  tableId: null,
  customerName: 'Ali',
  customerPhone: '+998901112233',
  address: 'Chilonzor 9, maktab yonida',
  cancelReason: null,
  itemsTotal: 45000,
  serviceChargePercent: 0,
  serviceCharge: 0,
  packagingFee: 0,
  deliveryFee: 15000,
  total: 60000,
  paidAmount: 0,
  note: null,
  createdById: null,
  publicToken: 't',
  createdAt: new Date().toISOString(),
  items: [
    {
      id: `${id}-i`,
      productId: 'p',
      variantId: null,
      name: 'Osh',
      price: 45000,
      unit: 'PIECE',
      quantity: 1,
      weighed: true,
      sendsToKitchen: true,
      note: null,
      addedQuantity: 0,
    },
  ],
  payments: [],
});

function show({
  orderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
  orders = [delivery('a', 1, 'NEW'), delivery('b', 2, 'READY')],
} = {}) {
  const sent: { path: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      if (init?.method && init.method !== 'GET') {
        sent.push({ path: url.pathname, body: JSON.parse(String(init.body)) });
        return json(orders[0]);
      }
      if (url.pathname.endsWith('/cafes/current')) return json({ orderTypes });
      if (url.pathname.endsWith('/tables')) return json([]);
      return json({ items: orders, total: orders.length, page: 1, limit: 100 });
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
      permissions: Object.values(Permission),
    },
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <DeliveryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return sent;
}

describe('DeliveryPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('puts orders waiting for a call first, with a number to call and the address', async () => {
    show();
    const waiting = await screen.findByRole('region', {
      name: uz.delivery.groups.waiting,
    });
    expect(within(waiting).getByText('#D-1')).toBeInTheDocument();
    expect(
      within(waiting).getByText('Chilonzor 9, maktab yonida'),
    ).toBeVisible();
    expect(
      within(waiting).getByRole('link', { name: uz.delivery.call }),
    ).toHaveAttribute('href', 'tel:+998901112233');
    const ready = screen.getByRole('region', {
      name: uz.delivery.groups.ready,
    });
    expect(within(ready).getByText('#D-2')).toBeInTheDocument();
  });

  it('accepts after the call, and hands a ready one to the courier', async () => {
    const sent = show();
    const waiting = await screen.findByRole('region', {
      name: uz.delivery.groups.waiting,
    });
    await userEvent.click(
      within(waiting).getByRole('button', { name: uz.delivery.next.ACCEPTED }),
    );
    const ready = screen.getByRole('region', {
      name: uz.delivery.groups.ready,
    });
    await userEvent.click(
      within(ready).getByRole('button', { name: uz.delivery.next.SERVED }),
    );
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent).toEqual([
      { path: '/api/v1/orders/a/status', body: { status: 'ACCEPTED' } },
      { path: '/api/v1/orders/b/status', body: { status: 'SERVED' } },
    ]);
  });

  it('cancels with a reason for the customer', async () => {
    const sent = show();
    const waiting = await screen.findByRole('region', {
      name: uz.delivery.groups.waiting,
    });
    await userEvent.click(
      within(waiting).getByRole('button', { name: uz.orders.cancel }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', {
        name: uz.orders.cancelReasons.soldOut,
      }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: uz.orders.cancel }),
    );
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      path: '/api/v1/orders/a/cancel',
      body: { reason: uz.orders.cancelReasons.soldOut },
    });
  });

  it('points to the settings while delivery is turned off', async () => {
    show({ orderTypes: ['DINE_IN'] });
    expect(
      await screen.findByRole('link', { name: uz.nav.settings }),
    ).toHaveAttribute('href', '/settings');
  });
});
