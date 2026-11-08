import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import uz from '@/shared/i18n/uz.json';
import '@/shared/i18n';
import type { CafeDto } from '@/shared/api/generated/model';
import { useSessionStore } from '@/shared/auth/session-store';
import { OrderSettingsForm } from './OrderSettingsForm';

const CAFE = {
  id: 'c',
  name: 'Cafe',
  slug: 'cafe',
  orderTypes: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
  serviceChargePercent: 0,
  packagingFee: 0,
  deliveryFee: 0,
  deliveryMode: 'OWN',
  location: null,
} as unknown as CafeDto;

function stubPatch() {
  const bodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit) => {
      if (init.method === 'PATCH') bodies.push(JSON.parse(init.body as string));
      return Promise.resolve(
        new Response(JSON.stringify(CAFE), { status: 200 }),
      );
    }),
  );
  return bodies;
}

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrderSettingsForm cafe={CAFE} />
    </QueryClientProvider>,
  );

describe('OrderSettingsForm', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'authenticated', accessToken: 't' });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('saves the kinds of order and the charges, with the delivery fee', async () => {
    const bodies = stubPatch();
    renderForm();
    await userEvent.click(
      screen.getByRole('checkbox', { name: uz.orders.type.TAKEAWAY }),
    );
    const percent = screen.getByLabelText(uz.settings.orders.serviceCharge);
    await userEvent.clear(percent);
    await userEvent.type(percent, '10');
    const packaging = screen.getByLabelText(uz.settings.orders.packagingFee);
    await userEvent.clear(packaging);
    await userEvent.type(packaging, '2 000');
    const delivery = screen.getByLabelText(uz.settings.orders.deliveryFee);
    await userEvent.clear(delivery);
    await userEvent.type(delivery, '15000');
    await userEvent.click(screen.getByRole('button', { name: uz.common.save }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      orderTypes: ['DINE_IN', 'DELIVERY'],
      serviceChargePercent: 10,
      packagingFee: 2000,
      deliveryFee: 15000,
      deliveryMode: 'OWN',
      location: null,
    });
  });

  it('needs at least one kind of order and a sensible rate', async () => {
    const bodies = stubPatch();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OrderSettingsForm cafe={{ ...CAFE, orderTypes: ['DINE_IN'] }} />
      </QueryClientProvider>,
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: uz.orders.type.DINE_IN }),
    );
    const percent = screen.getByLabelText(uz.settings.orders.serviceCharge);
    await userEvent.clear(percent);
    await userEvent.type(percent, '60');
    await userEvent.click(screen.getByRole('button', { name: uz.common.save }));

    expect(screen.getByText(uz.settings.orders.typeRequired)).toBeVisible();
    expect(screen.getByText(uz.settings.orders.percentInvalid)).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  it('hands deliveries to Stolchi couriers only once the cafe is on the map', async () => {
    const bodies = stubPatch();
    renderForm();
    await userEvent.click(
      screen.getByRole('radio', {
        name: new RegExp(uz.settings.orders.mode.NETWORK),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: uz.common.save }));
    expect(
      screen.getByText(uz.settings.orders.cafeLocationRequired),
    ).toBeVisible();
    expect(bodies).toHaveLength(0);

    cleanup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OrderSettingsForm
          cafe={{ ...CAFE, location: { latitude: 41.3, longitude: 69.24 } }}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(
      screen.getByRole('radio', {
        name: new RegExp(uz.settings.orders.mode.BOTH),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: uz.common.save }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      deliveryMode: 'BOTH',
      location: { latitude: 41.3, longitude: 69.24 },
    });
  });
});
