import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import uz from '@/shared/i18n/uz.json';
import '@/shared/i18n';
import { Permission, type OrderStatus } from '@/shared/api/generated/model';
import { useSessionStore } from '@/shared/auth/session-store';
import { KitchenPage } from './KitchenPage';

const order = (
  id: string,
  number: number,
  status: OrderStatus,
  createdAt: string,
) => ({
  id,
  number,
  displayNumber: String(number),
  status,
  type: 'DINE_IN',
  source: 'POS',
  tableId: 't1',
  total: 1000,
  paidAmount: 0,
  note: null,
  items: [
    {
      id: `${id}-i`,
      name: 'Osh',
      price: 1000,
      quantity: 2,
      note: 'Piyozsiz',
      productId: 'p',
      unit: 'PIECE',
      weighed: true,
      sendsToKitchen: true,
    },
  ],
  payments: [],
  createdAt,
});

function stubApi(orders: unknown[], failStatus?: string) {
  const changes: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const json = (body: unknown, status = 200) =>
        Promise.resolve(new Response(JSON.stringify(body), { status }));
      if (init.method === 'PATCH') {
        const { status } = JSON.parse(init.body as string) as {
          status: string;
        };
        if (status === failStatus) return json({ message: 'No' }, 409);
        changes.push(`${path.split('/')[4]}:${status}`);
        return json({});
      }
      if (path === '/api/v1/tables') {
        return json([
          { id: 't1', name: 'Stol 3', zone: null, qrToken: 'q', menuUrl: 'u' },
        ]);
      }
      return json({ items: orders, total: orders.length, page: 1, limit: 100 });
    }),
  );
  return changes;
}

const ROLES = {
  OWNER: Object.values(Permission),
  CASHIER: [
    Permission.KITCHEN_WORK,
    Permission.ORDERS_VIEW,
    Permission.ORDERS_SERVE,
  ],
  COOK: [Permission.KITCHEN_WORK],
};

function renderAs(role: keyof typeof ROLES) {
  useSessionStore.setState({
    status: 'authenticated',
    accessToken: 't',
    user: {
      id: 'u',
      cafeId: 'c',
      name: 'A',
      phone: '+998900000000',
      isSuperAdmin: false,
      role: { id: 'r', name: role, systemKey: role },
      permissions: ROLES[role],
    },
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <KitchenPage />
    </QueryClientProvider>,
  );
}

const column = (name: string) => screen.findByRole('region', { name });

describe('KitchenPage', () => {
  it('marks an order the customer placed by QR', async () => {
    stubApi([
      {
        ...order('a', 5, 'ACCEPTED', '2026-01-31T10:00:00Z'),
        displayNumber: 'Q-5',
        source: 'QR',
      },
    ]);
    renderAs('COOK');
    expect(await screen.findByText('#Q-5')).toBeInTheDocument();
    expect(screen.getByText(uz.orders.source.QR)).toBeInTheDocument();
  });

  it('marks food added after cooking began', async () => {
    const added = order('a', 1, 'COOKING', '2026-01-31T10:00:00Z');
    stubApi([
      {
        ...added,
        items: [
          {
            id: 'i',
            productId: 'p',
            name: 'Choy',
            price: 5000,
            quantity: 3,
            note: null,
            addedQuantity: 2,
            unit: 'PIECE',
            weighed: true,
            sendsToKitchen: true,
          },
        ],
      },
    ]);
    renderAs('COOK');
    expect(
      await screen.findByText(uz.kitchen.added.replace('{{count}}', '2')),
    ).toBeInTheDocument();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('sorts orders into columns, oldest first, leaving out served ones', async () => {
    stubApi([
      order('b', 2, 'NEW', '2026-01-31T10:05:00Z'),
      order('a', 1, 'ACCEPTED', '2026-01-31T10:00:00Z'),
      order('c', 3, 'COOKING', '2026-01-31T10:00:00Z'),
      order('d', 4, 'READY', '2026-01-31T10:00:00Z'),
      order('e', 5, 'SERVED', '2026-01-31T10:00:00Z'),
    ]);
    renderAs('COOK');
    const fresh = await column(uz.kitchen.columns.new);
    const headings = await within(fresh).findAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      uz.orders.title.replace('{{number}}', '1'),
      uz.orders.title.replace('{{number}}', '2'),
    ]);
    expect(
      within(await column(uz.kitchen.columns.cooking)).getByText('#3'),
    ).toBeVisible();
    expect(
      within(await column(uz.kitchen.columns.ready)).getByText('#4'),
    ).toBeVisible();
    expect(screen.queryByText('#5')).toBeNull();
    expect(await within(fresh).findAllByText('Stol 3')).toHaveLength(2);
    expect(within(fresh).getAllByText('Piyozsiz')).toHaveLength(2);
  });

  it('takes a new order through every step the backend needs, in order', async () => {
    const changes = stubApi([order('a', 1, 'NEW', '2026-01-31T10:00:00Z')]);
    renderAs('COOK');
    await userEvent.click(
      await screen.findByRole('button', { name: uz.kitchen.move.COOKING }),
    );
    await waitFor(() => expect(changes).toEqual(['a:ACCEPTED', 'a:COOKING']));
  });

  it('gives a cook no way to mark an order served, but a cashier one', async () => {
    const orders = [order('d', 4, 'READY', '2026-01-31T10:00:00Z')];
    stubApi(orders);
    renderAs('COOK');
    await screen.findByText('#4');
    expect(
      screen.queryByRole('button', { name: uz.kitchen.move.SERVED }),
    ).toBeNull();
    cleanup();

    const changes = stubApi(orders);
    renderAs('CASHIER');
    await userEvent.click(
      await screen.findByRole('button', { name: uz.kitchen.move.SERVED }),
    );
    await waitFor(() => expect(changes).toEqual(['d:SERVED']));
  });

  it('puts a card back and explains when the move fails', async () => {
    stubApi([order('c', 3, 'COOKING', '2026-01-31T10:00:00Z')], 'READY');
    renderAs('COOK');
    await userEvent.click(
      await screen.findByRole('button', { name: uz.kitchen.move.READY }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      uz.common.errors.conflict,
    );
    await waitFor(async () =>
      expect(
        within(await column(uz.kitchen.columns.cooking)).getByText('#3'),
      ).toBeVisible(),
    );
  });
});
