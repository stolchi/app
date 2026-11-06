import { useSessionStore } from '@/shared/auth/session-store';
import { createRealtime } from './connection';

type Handler = (...args: unknown[]) => void;

const fake = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  active: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  auth: undefined as ((send: (data: object) => void) => void) | undefined,
}));

vi.mock('socket.io-client', () => ({
  io: (_url: string, options: { auth: typeof fake.auth }) => {
    fake.auth = options.auth;
    return {
      on: (event: string, handler: Handler) =>
        fake.handlers.set(event, handler),
      connect: fake.connect,
      disconnect: fake.disconnect,
      get active() {
        return fake.active;
      },
    };
  },
}));

const refreshResponds = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status })),
    ),
  );

describe('realtime connection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fake.handlers.clear();
    fake.active = true;
    fake.connect.mockClear();
    fake.disconnect.mockClear();
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 'old',
      user: null,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const emit = (event: string, ...args: unknown[]) =>
    fake.handlers.get(event)?.(...args);

  it('connects with the current token, read at connection time', () => {
    createRealtime().start();
    expect(fake.connect).toHaveBeenCalledOnce();
    const send = vi.fn();
    useSessionStore.getState().setAccessToken('newer');
    fake.auth?.(send);
    expect(send).toHaveBeenCalledWith({ token: 'newer' });
  });

  it('reconnects with a fresh token when the server drops an expired one', async () => {
    refreshResponds(200, { accessToken: 'fresh' });
    createRealtime().start();
    fake.connect.mockClear();
    emit('disconnect', 'io server disconnect');
    await vi.waitFor(() => expect(fake.connect).toHaveBeenCalledOnce());
    expect(useSessionStore.getState().accessToken).toBe('fresh');
  });

  it('leaves network drops to socket.io', () => {
    refreshResponds(200, { accessToken: 'fresh' });
    createRealtime().start();
    fake.connect.mockClear();
    emit('disconnect', 'transport close');
    expect(fetch).not.toHaveBeenCalled();
    expect(fake.connect).not.toHaveBeenCalled();
  });

  it('retries after a refused connection, but not in a tight loop', async () => {
    refreshResponds(200, { accessToken: 'fresh' });
    createRealtime().start();
    fake.connect.mockClear();
    fake.active = false;
    emit('connect_error', new Error('Unauthorized'));
    expect(fake.connect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fake.connect).toHaveBeenCalledOnce();
  });

  it('signs out when the session is over', async () => {
    refreshResponds(401);
    createRealtime().start();
    emit('disconnect', 'io server disconnect');
    await vi.waitFor(() =>
      expect(useSessionStore.getState().status).toBe('anonymous'),
    );
  });

  it('keeps trying through a server outage without signing out', async () => {
    refreshResponds(503);
    createRealtime().start();
    fake.connect.mockClear();
    emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(0);
    expect(useSessionStore.getState().status).toBe('authenticated');
    refreshResponds(200, { accessToken: 'fresh' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(fake.connect).toHaveBeenCalledOnce();
  });

  it('stays down after being stopped', async () => {
    refreshResponds(200, { accessToken: 'fresh' });
    const realtime = createRealtime();
    realtime.start();
    realtime.stop();
    fake.connect.mockClear();
    emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.connect).not.toHaveBeenCalled();
    expect(fake.disconnect).toHaveBeenCalled();
  });
});
