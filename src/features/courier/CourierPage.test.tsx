import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '@/shared/auth/session-store';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { CourierPage } from './CourierPage';

const order = (id: string, status: string, extra: object = {}) => ({
  id,
  number: 1,
  displayNumber: `D-${id}`,
  status,
  type: 'DELIVERY',
  source: 'POS',
  customerName: 'Aziz',
  customerPhone: '+998901112233',
  address: 'Chilonzor 9',
  location: { latitude: 41.285601, longitude: 69.203412 },
  note: null,
  total: 60000,
  paidAmount: 0,
  deliveryEta: null,
  courier: null,
  items: [
    {
      id: `${id}-i`,
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
  createdAt: '2026-01-31T10:00:00Z',
  ...extra,
});

function show({ mine = [] as object[], available = [] as object[] } = {}) {
  const sent: { path: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), { status: 200 });
      if (init?.method === 'POST') {
        sent.push({
          path,
          body: init.body ? JSON.parse(String(init.body)) : {},
        });
        return json(order('a', 'READY'));
      }
      if (path.endsWith('/courier/orders/available')) return json(available);
      return json(mine);
    }),
  );
  useSessionStore.setState({ status: 'authenticated', accessToken: 't' });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CourierPage />
    </QueryClientProvider>,
  );
  return sent;
}

describe('CourierPage (the cafe’s own courier)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens on free deliveries when the courier has none, and takes one', async () => {
    const sent = show({ available: [order('a', 'COOKING')] });
    await userEvent.click(
      await screen.findByRole('button', {
        name: uz.courierPage.available.take,
      }),
    );
    await waitFor(() =>
      expect(sent).toEqual([
        { path: '/api/v1/courier/orders/a/claim', body: {} },
      ]),
    );
  });

  it('leaves with a time to arrive', async () => {
    const sent = show({ mine: [order('a', 'READY')] });
    await userEvent.click(
      await screen.findByRole('button', { name: uz.courierPage.mine.pickUp }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: uz.courierPage.pickUp.title.replace('{{number}}', 'D-a'),
    });
    await userEvent.click(
      within(sheet).getByRole('button', {
        name: uz.courierPage.pickUp.minutes.replace('{{count}}', '30'),
      }),
    );
    await waitFor(() =>
      expect(sent).toEqual([
        { path: '/api/v1/courier/orders/a/pick-up', body: { etaMinutes: 30 } },
      ]),
    );
  });

  it('delivers, saying how the money was taken', async () => {
    const sent = show({ mine: [order('a', 'SERVED')] });
    await userEvent.click(
      await screen.findByRole('button', { name: uz.courierPage.mine.deliver }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: uz.courierPage.deliver.title.replace('{{number}}', 'D-a'),
    });
    await userEvent.click(
      within(sheet).getByRole('button', { name: uz.courierPage.deliver.cash }),
    );
    await waitFor(() =>
      expect(sent).toEqual([
        { path: '/api/v1/courier/orders/a/deliver', body: { method: 'CASH' } },
      ]),
    );
  });
});
