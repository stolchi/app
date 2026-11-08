import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { useSessionStore } from '@/shared/auth/session-store';
import { LocationField } from './LocationField';

vi.mock('./MapPicker', () => ({ default: () => <div>map</div> }));

function withQueries(children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function stubSearch(places: object[]) {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify(places), { status: 200 });
    }),
  );
  return urls;
}

describe('LocationField', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'authenticated', accessToken: 't' });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reads a pasted link, and keeps the form around it from submitting', async () => {
    stubSearch([]);
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) =>
      event.preventDefault(),
    );
    render(
      withQueries(
        <form onSubmit={onSubmit}>
          <LocationField value={null} onChange={onChange} />
        </form>,
      ),
    );
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.pick }),
    );
    await userEvent.type(
      await screen.findByLabelText(uz.location.search),
      'https://yandex.uz/maps/?pt=69.203412,41.285601{Enter}',
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('41.285601, 69.203412')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.confirm }),
    );
    expect(onChange).toHaveBeenCalledWith({
      latitude: 41.285601,
      longitude: 69.203412,
    });
  });

  it('finds a place by name and puts the point there', async () => {
    const urls = stubSearch([
      { name: "Farg'ona, O'zbekiston", latitude: 40.38, longitude: 71.78 },
    ]);
    const onChange = vi.fn();
    render(withQueries(<LocationField value={null} onChange={onChange} />));
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.pick }),
    );
    await userEvent.type(
      await screen.findByLabelText(uz.location.search),
      "Farg'ona",
    );
    await userEvent.click(
      await screen.findByRole('button', { name: "Farg'ona, O'zbekiston" }),
    );
    expect(screen.getByText('40.380000, 71.780000')).toBeInTheDocument();
    expect(urls.filter((url) => url.includes('/geo/search'))).toHaveLength(1);
    // The name stays out: an order's location is the point and nothing else.
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.confirm }),
    );
    expect(onChange).toHaveBeenCalledWith({
      latitude: 40.38,
      longitude: 71.78,
    });
  });

  it('says so when nothing can be read from it', async () => {
    stubSearch([]);
    render(withQueries(<LocationField value={null} onChange={vi.fn()} />));
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.pick }),
    );
    await userEvent.type(
      await screen.findByLabelText(uz.location.search),
      'https://maps.app.goo.gl/abc{Enter}',
    );
    expect(screen.getByText(uz.location.unreadable)).toBeInTheDocument();
  });
});
