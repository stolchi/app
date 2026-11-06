import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { CustomerScreen } from './CustomerScreen';

vi.mock('socket.io-client', () => ({
  io: () => ({ on: vi.fn(), disconnect: vi.fn() }),
}));

function show(body: object | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body ?? { message: 'Not Found' }), {
          status: body ? 200 : 404,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retryDelay: 1 } } })
      }
    >
      <MemoryRouter initialEntries={['/screen/demo']}>
        <Routes>
          <Route path="/screen/:slug" element={<CustomerScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CustomerScreen', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the numbers in their two columns', async () => {
    show({
      cafeName: 'Demo',
      logoUrl: null,
      primaryColor: null,
      preparing: ['3', 'Q-4'],
      ready: ['2'],
    });
    const preparing = await screen.findByRole('region', {
      name: uz.screen.preparing,
    });
    const ready = screen.getByRole('region', { name: uz.screen.ready });
    expect(
      within(preparing)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['3', 'Q-4']);
    expect(within(ready).getByRole('listitem')).toHaveTextContent('2');
  });

  it('says so when there is no such cafe', async () => {
    show(null);
    expect(await screen.findByText(uz.screen.notFound)).toBeInTheDocument();
  });
});
