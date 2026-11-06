import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import uz from '@/shared/i18n/uz.json';
import '@/shared/i18n';
import { useSessionStore } from '@/shared/auth/session-store';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const USER = {
  id: '1',
  cafeId: '2',
  name: 'Aziz',
  phone: '+998901234567',
  isSuperAdmin: false,
  role: { id: 'r', name: 'Boshliq', systemKey: 'OWNER' },
  permissions: ['MENU_MANAGE'],
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/', element: <p>home</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function stubApi(status: number, body: unknown) {
  const mock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    () => Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

const phoneField = () => screen.getByLabelText(uz.auth.fields.phone);
const passwordField = () => screen.getByLabelText(uz.auth.fields.password);

describe('LoginPage', () => {
  beforeEach(() => useSessionStore.getState().signOut());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const submit = () =>
    userEvent.click(screen.getByRole('button', { name: uz.auth.login.submit }));

  it('shows Uzbek validation errors and does not call the API', async () => {
    const fetch = stubApi(200, {});
    renderAt('/login');
    await submit();
    expect(await screen.findByText(uz.auth.errors.phoneInvalid)).toBeVisible();
    expect(screen.getByText(uz.auth.errors.passwordRequired)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('signs in, and accepts a phone number typed with spaces', async () => {
    const fetch = stubApi(200, { accessToken: 'token', user: USER });
    const router = renderAt('/login');
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '+998 90 123 45 67');
    await userEvent.type(passwordField(), 'secret-password');
    await submit();

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({
      phone: '+998901234567',
      password: 'secret-password',
    });
    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'token',
      user: USER,
    });
  });

  it('accepts a full number pasted after the prefilled +998', async () => {
    const fetch = stubApi(200, { accessToken: 'token', user: USER });
    renderAt('/login');
    await userEvent.type(phoneField(), '+998 90 123 45 67');
    await userEvent.type(passwordField(), 'secret-password');
    await submit();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(fetch.mock.calls[0][1].body as string).phone).toBe(
      '+998901234567',
    );
  });

  it('explains wrong credentials in Uzbek', async () => {
    stubApi(401, { message: 'Invalid phone number or password' });
    renderAt('/login');
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '+998901234567');
    await userEvent.type(passwordField(), 'wrong-password');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      uz.auth.errors.invalidCredentials,
    );
    expect(useSessionStore.getState().status).toBe('anonymous');
  });

  it('explains a server that cannot be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    renderAt('/login');
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '+998901234567');
    await userEvent.type(passwordField(), 'password');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      uz.common.errors.network,
    );
  });
});

describe('RegisterPage', () => {
  beforeEach(() => useSessionStore.getState().signOut());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function fill(password = 'long-enough-password') {
    await userEvent.type(
      screen.getByLabelText(uz.auth.fields.cafeName),
      'Oqtepa Kafe',
    );
    await userEvent.type(
      screen.getByLabelText(uz.auth.fields.ownerName),
      'Aziz',
    );
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '+998901234567');
    await userEvent.type(passwordField(), password);
    await userEvent.click(
      screen.getByRole('button', { name: uz.auth.register.submit }),
    );
  }

  it('creates the cafe and signs in', async () => {
    const fetch = stubApi(201, { accessToken: 'token', user: USER });
    const router = renderAt('/register');
    await fill();
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({
      cafeName: 'Oqtepa Kafe',
      ownerName: 'Aziz',
      phone: '+998901234567',
      password: 'long-enough-password',
    });
  });

  it('applies the same password rule as the backend', async () => {
    const fetch = stubApi(201, {});
    renderAt('/register');
    await fill('short');
    expect(
      await screen.findByText(uz.auth.errors.passwordTooShort),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('explains a phone number that is already registered', async () => {
    stubApi(409, { message: 'This phone number is already registered' });
    renderAt('/register');
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      uz.auth.errors.phoneTaken,
    );
  });
});
