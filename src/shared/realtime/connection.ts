import { io, type Socket } from 'socket.io-client';
import { API_URL, refreshAccessToken } from '@/shared/api/client';
import { useSessionStore } from '@/shared/auth/session-store';

const RETRY_MS = 3000;

export interface Realtime {
  socket: Socket;
  start: () => void;
  stop: () => void;
}

/**
 * The server disconnects a staff socket when its token expires and refuses expired
 * tokens, and in both cases socket.io does not retry by itself. So those two cases
 * get a fresh token here; network failures are left to socket.io's own reconnection.
 */
export function createRealtime(): Realtime {
  const socket = io(API_URL, {
    autoConnect: false,
    auth: (send) => send({ token: useSessionStore.getState().accessToken }),
  });
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reconnectWithFreshToken = async () => {
    const session = useSessionStore.getState();
    try {
      const token = await refreshAccessToken();
      if (!running) return;
      if (!token) {
        session.signOut();
        return;
      }
      session.setAccessToken(token);
      socket.connect();
    } catch {
      if (running)
        timer = setTimeout(() => void reconnectWithFreshToken(), RETRY_MS);
    }
  };

  socket.on('disconnect', (reason) => {
    if (running && reason === 'io server disconnect') {
      void reconnectWithFreshToken();
    }
  });
  socket.on('connect_error', () => {
    if (running && !socket.active) {
      clearTimeout(timer);
      timer = setTimeout(() => void reconnectWithFreshToken(), RETRY_MS);
    }
  });

  return {
    socket,
    start: () => {
      running = true;
      socket.connect();
    },
    stop: () => {
      running = false;
      clearTimeout(timer);
      socket.disconnect();
    },
  };
}
