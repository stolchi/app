import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { authControllerMe } from '@/shared/api/generated/auth/auth';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { useSessionStore } from '@/shared/auth/session-store';
import { createRealtime } from './connection';

const SocketContext = createContext<Socket | null>(null);

/** Keeps the socket open while signed in, and cached data in step with its events. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [realtime] = useState(createRealtime);

  useEffect(() => {
    const { socket } = realtime;
    // Tables too: an order can name one added after this screen loaded its list,
    // and a kitchen screen stays open all day.
    const refreshOrders = () =>
      void invalidate(
        queryClient,
        ApiPath.orders,
        ApiPath.dashboard,
        ApiPath.tables,
      );
    const refreshProducts = () =>
      void invalidate(queryClient, ApiPath.products);
    // Anything could have happened while the connection was down.
    const refreshAll = () => {
      refreshOrders();
      refreshProducts();
      // The server also disconnects someone whose role changed, to get them here.
      authControllerMe().then(useSessionStore.getState().setUser, () => {});
    };

    socket.on('connect', refreshAll);
    socket.on('order.created', refreshOrders);
    socket.on('order.updated', refreshOrders);
    socket.on('order.status_changed', refreshOrders);
    socket.on('product.availability_changed', refreshProducts);
    realtime.start();

    return () => {
      realtime.stop();
      socket.off('connect', refreshAll);
      socket.off('order.created', refreshOrders);
      socket.off('order.updated', refreshOrders);
      socket.off('order.status_changed', refreshOrders);
      socket.off('product.availability_changed', refreshProducts);
    };
  }, [realtime, queryClient]);

  return (
    <SocketContext.Provider value={realtime.socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useContext(SocketContext);
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    if (!socket) return;
    const listener = (data: T) => onEvent(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

export function useSocketConnected(): boolean {
  const socket = useContext(SocketContext);
  return useSyncExternalStore(
    (notify) => {
      socket?.on('connect', notify);
      socket?.on('disconnect', notify);
      return () => {
        socket?.off('connect', notify);
        socket?.off('disconnect', notify);
      };
    },
    () => socket?.connected ?? false,
  );
}
