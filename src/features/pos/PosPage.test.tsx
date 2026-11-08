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
import { useSessionStore } from '@/shared/auth/session-store';
import { activeDraft, useCartStore } from './cart-store';
import { PosPage } from './PosPage';

const CATEGORY = { id: 'c1', name: 'Taomlar', sortOrder: 0, isActive: true };
const product = (id: string, name: string, price: number, extra = {}) => ({
  id,
  categoryId: 'c1',
  name,
  description: null,
  price,
  imageUrl: null,
  isAvailable: true,
  sortOrder: 0,
  ...extra,
});
const OSH = product('p1', 'Osh', 45000);
const SOMSA = product('p2', 'Somsa', 8000);
const NOT_LEFT = product('p3', 'Lagmon', 30000, { isAvailable: false });
const TABLES = [
  { id: 't10', name: 'Stol 10', zone: null, qrToken: 'a', menuUrl: 'x' },
  { id: 't2', name: 'Stol 2', zone: null, qrToken: 'b', menuUrl: 'y' },
];

const CAFE = {
  id: 'c',
  name: 'Cafe',
  slug: 'cafe',
  orderTypes: ['DINE_IN', 'TAKEAWAY'],
  serviceChargePercent: 0,
  packagingFee: 0,
  deliveryFee: 0,
};

function stubApi(onCreate: (body: unknown) => Response, cafe: object = CAFE) {
  const posts: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const json = (body: unknown) =>
        Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      if (init.method === 'POST' && path === '/api/v1/orders') {
        const body = JSON.parse(init.body as string);
        posts.push(body);
        return Promise.resolve(onCreate(body));
      }
      if (path === '/api/v1/categories') return json([CATEGORY]);
      if (path === '/api/v1/products') return json([OSH, SOMSA, NOT_LEFT]);
      if (path === '/api/v1/tables') return json(TABLES);
      if (path === '/api/v1/cafes/current') return json(cafe);
      if (path === '/api/v1/orders') {
        return json({ items: [], total: 0, page: 1, limit: 100 });
      }
      if (path === '/api/v1/orders/o1') return json(CREATED);
      return json({});
    }),
  );
  return posts;
}

const CREATED = {
  id: 'o1',
  number: 7,
  displayNumber: '7',
  status: 'NEW',
  type: 'TAKEAWAY',
  source: 'POS',
  tableId: null,
  total: 53000,
  paidAmount: 0,
  items: [],
  payments: [],
  createdAt: '2026-01-31T10:00:00Z',
};

const created = () => new Response(JSON.stringify(CREATED), { status: 201 });

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PosPage />
    </QueryClientProvider>,
  );
}

const tile = async (name: RegExp) => screen.findByRole('button', { name });

describe('PosPage', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 't',
      user: {
        id: 'u',
        cafeId: 'c',
        name: 'A',
        phone: '+998900000000',
        isSuperAdmin: false,
        role: { id: 'r', name: 'Kassir', systemKey: 'CASHIER' },
        permissions: ['ORDERS_VIEW', 'ORDERS_CREATE', 'ORDERS_PAYMENT'],
      },
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('serves another customer in between, then carries on with the first', async () => {
    const posts = stubApi(created);
    renderPage();
    await userEvent.click(await tile(/^Osh.*so'm/));

    await userEvent.click(
      screen.getAllByRole('button', { name: uz.pos.newDraft })[0],
    );
    await userEvent.click(await tile(/^Somsa.*so'm/));
    await userEvent.click(
      screen.getByRole('button', { name: uz.orders.type.TAKEAWAY }),
    );
    await userEvent.click(screen.getByRole('button', { name: uz.pos.send }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({ items: [{ productId: 'p2' }] });

    await waitFor(() => {
      const cart = useCartStore.getState();
      expect(cart.drafts).toHaveLength(1);
      expect(activeDraft(cart).lines.map((line) => line.productId)).toEqual([
        'p1',
      ]);
    });
  });

  it('adds products, totals them and sends a takeaway order with notes', async () => {
    const posts = stubApi(created);
    renderPage();
    await userEvent.click(await tile(/^Osh.*so'm/));
    await userEvent.click(await tile(/^Osh.*so'm/));
    await userEvent.click(await tile(/^Somsa.*so'm/));
    expect(screen.getAllByText("98 000 so'm")[0]).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', {
        name: uz.pos.increase.replace('{{name}}', 'Somsa'),
      }),
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: uz.pos.decrease.replace('{{name}}', 'Somsa'),
      }),
    );
    await userEvent.type(
      screen.getByLabelText(uz.pos.noteFor.replace('{{name}}', 'Osh')),
      ' piyozsiz ',
    );
    await userEvent.click(
      screen.getByRole('button', { name: uz.orders.type.TAKEAWAY }),
    );
    await userEvent.click(screen.getByRole('button', { name: uz.pos.send }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      type: 'TAKEAWAY',
      items: [
        { productId: 'p1', quantity: 2, note: 'piyozsiz' },
        { productId: 'p2', quantity: 1 },
      ],
    });
    await waitFor(() =>
      expect(activeDraft(useCartStore.getState()).lines).toEqual([]),
    );
  });

  it('needs a table for a dine-in order, listed in natural order', async () => {
    const posts = stubApi(created);
    renderPage();
    await userEvent.click(await tile(/^Osh.*so'm/));
    const send = screen.getByRole('button', { name: uz.pos.send });
    expect(send).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: uz.pos.chooseTable }),
    );
    const picker = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(
        within(picker)
          .getAllByRole('button', { pressed: false })
          .map((tile) => tile.textContent),
      ).toEqual(['Stol 2' + uz.pos.tableFree, 'Stol 10' + uz.pos.tableFree]),
    );
    await userEvent.click(
      within(picker).getByRole('button', { name: /Stol 2/ }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await userEvent.click(send);
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({ type: 'DINE_IN', tableId: 't2' });
  });

  it('adds the service charge to a dine-in order', async () => {
    stubApi(created, { ...CAFE, serviceChargePercent: 10, packagingFee: 2000 });
    renderPage();
    await userEvent.click(await tile(/^Osh.*so'm/));
    expect(
      await screen.findByText(
        uz.orders.amounts.service.replace('{{percent}}', '10'),
      ),
    ).toBeVisible();
    expect(screen.getByText("4 500 so'm")).toBeVisible();
    await waitFor(() =>
      expect(screen.getAllByText("49 500 so'm")[0]).toBeVisible(),
    );
  });

  it('offers only what the cafe takes, with its packaging fee', async () => {
    const posts = stubApi(created, {
      ...CAFE,
      orderTypes: ['TAKEAWAY'],
      serviceChargePercent: 10,
      packagingFee: 2000,
    });
    renderPage();
    await userEvent.click(await tile(/^Osh.*so'm/));
    expect(await screen.findByText(uz.orders.amounts.packaging)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: uz.orders.type.TAKEAWAY }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: uz.pos.chooseTable }),
    ).toBeNull();
    await waitFor(() =>
      expect(screen.getAllByText("47 000 so'm")[0]).toBeVisible(),
    );

    await userEvent.click(screen.getByRole('button', { name: uz.pos.send }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({ type: 'TAKEAWAY' });
  });

  it('cannot add a sold-out product', async () => {
    stubApi(created);
    renderPage();
    expect(await tile(/^Lagmon/)).toBeDisabled();
  });

  it('keeps the cart when sending fails, and says why', async () => {
    stubApi(
      () =>
        new Response(JSON.stringify({ message: '"Osh" is not available' }), {
          status: 409,
        }),
    );
    renderPage();
    await userEvent.click(await tile(/^Osh.*so'm/));
    await userEvent.click(
      screen.getByRole('button', { name: uz.orders.type.TAKEAWAY }),
    );
    await userEvent.click(screen.getByRole('button', { name: uz.pos.send }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      uz.pos.errors.productUnavailable,
    );
    expect(activeDraft(useCartStore.getState()).lines).toHaveLength(1);
  });

  it('empties the cart when the session ends', () => {
    useCartStore.getState().add('p1');
    useSessionStore.getState().signOut();
    expect(activeDraft(useCartStore.getState()).lines).toEqual([]);
  });
});
