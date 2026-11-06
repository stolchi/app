import { useSessionStore } from '@/shared/auth/session-store';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const REFRESH_PATH = '/api/v1/auth/refresh';
const REFRESH_LOCK = 'stolchi-auth-refresh';

/** A failed API call, in the backend's error format. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, message: string | string[] | undefined) {
    const messages = [message ?? []].flat();
    super(messages.join(', ') || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

async function parse(response: Response): Promise<unknown> {
  // QR codes and PDFs: read as text, these would be corrupted.
  const type = response.headers.get('Content-Type') ?? '';
  if (response.ok && /^(image\/|application\/pdf)/.test(type)) {
    return response.blob();
  }
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function postRefresh(): Promise<string | null> {
  const response = await fetch(`${API_URL}${REFRESH_PATH}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new ApiError(response.status, undefined);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Gets a new access token, or null if the session is over.
 *
 * The backend treats a reused refresh token as theft and ends the session, so two
 * refreshes must never race. Calls within this tab share one request, and the Web
 * Lock makes other tabs wait, so each one sends the cookie the previous one received.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    const refresh = async (): Promise<string | null> =>
      navigator.locks
        ? await navigator.locks.request(REFRESH_LOCK, postRefresh)
        : await postRefresh();
    refreshInFlight = refresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function send(path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
}

/** Used by the generated API client for every request. */
export async function apiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const session = useSessionStore.getState();
  let response = await send(path, init, session.accessToken);

  // An expired access token: renew once and retry. A 401 from /auth/* is a real answer.
  if (response.status === 401 && !path.startsWith('/api/v1/auth/')) {
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      session.signOut();
      throw new ApiError(401, undefined);
    }
    session.setAccessToken(accessToken);
    response = await send(path, init, accessToken);
  }

  const body = await parse(response);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (body as { message?: string | string[] } | undefined)?.message,
    );
  }
  return body as T;
}
