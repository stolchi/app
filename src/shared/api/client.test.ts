import { useSessionStore } from '@/shared/auth/session-store';
import { ApiError, apiFetch, refreshAccessToken } from './client';

const REFRESH = '/api/v1/auth/refresh';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

function stubFetch(
  handler: (path: string, init: RequestInit) => Response | Promise<Response>,
) {
  const mock = vi.fn((url: string, init: RequestInit) =>
    Promise.resolve(handler(new URL(url).pathname, init)),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

const authHeader = (init: RequestInit) =>
  new Headers(init.headers).get('Authorization');

describe('apiFetch', () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 'old',
      user: null,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the token and the refresh cookie', async () => {
    const fetch = stubFetch(() => json(200, { ok: true }));
    await expect(apiFetch('/api/v1/orders', {})).resolves.toEqual({ ok: true });
    const init = fetch.mock.calls[0][1];
    expect(authHeader(init)).toBe('Bearer old');
    expect(init.credentials).toBe('include');
  });

  it('renews an expired token and retries the request once', async () => {
    const fetch = stubFetch((path, init) => {
      if (path === REFRESH) return json(200, { accessToken: 'new' });
      return authHeader(init) === 'Bearer new'
        ? json(200, { ok: true })
        : json(401, {});
    });
    await expect(apiFetch('/api/v1/orders', {})).resolves.toEqual({ ok: true });
    expect(useSessionStore.getState().accessToken).toBe('new');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('shares one refresh between requests that expire together', async () => {
    const fetch = stubFetch((path, init) => {
      if (path === REFRESH) return json(200, { accessToken: 'new' });
      return authHeader(init) === 'Bearer new' ? json(200, {}) : json(401, {});
    });
    await Promise.all([
      apiFetch('/api/v1/a', {}),
      apiFetch('/api/v1/b', {}),
      apiFetch('/api/v1/c', {}),
    ]);
    const refreshes = fetch.mock.calls.filter(([url]) => url.endsWith(REFRESH));
    expect(refreshes).toHaveLength(1);
  });

  it('signs out when the session cannot be renewed', async () => {
    stubFetch(() => json(401, {}));
    await expect(apiFetch('/api/v1/orders', {})).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(useSessionStore.getState().status).toBe('anonymous');
  });

  it('stays signed in when renewal fails for another reason', async () => {
    stubFetch((path) => (path === REFRESH ? json(500, {}) : json(401, {})));
    await expect(apiFetch('/api/v1/orders', {})).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('does not try to renew on a failed login', async () => {
    const fetch = stubFetch(() => json(401, { message: 'Invalid' }));
    await expect(apiFetch('/api/v1/auth/login', {})).rejects.toMatchObject({
      status: 401,
      messages: ['Invalid'],
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps all validation messages', async () => {
    stubFetch(() => json(400, { message: ['a is bad', 'b is bad'] }));
    await expect(apiFetch('/api/v1/orders', {})).rejects.toMatchObject({
      status: 400,
      messages: ['a is bad', 'b is bad'],
    });
  });

  it('returns files as a Blob, byte for byte', async () => {
    const png = new Uint8Array([0x89, 0x50, 0xff, 0xd8]);
    stubFetch(
      () =>
        new Response(png, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }),
    );
    const blob = await apiFetch<Blob>('/api/v1/tables/1/qr', {});
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(png);
  });

  it('handles an empty response', async () => {
    stubFetch(() => new Response(null, { status: 204 }));
    await expect(apiFetch('/api/v1/x', {})).resolves.toBeUndefined();
  });
});

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('holds a Web Lock, so other tabs cannot refresh at the same time', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<unknown>) =>
      callback(),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    stubFetch(() => json(200, { accessToken: 'new' }));
    await expect(refreshAccessToken()).resolves.toBe('new');
    expect(request).toHaveBeenCalledOnce();
  });
});
