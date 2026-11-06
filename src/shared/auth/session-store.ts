import { create } from 'zustand';
import type { Permission, UserDto } from '@/shared/api/generated/model';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  status: Status;
  /** Kept in memory only: the long-lived refresh token is in an httpOnly cookie. */
  accessToken: string | null;
  user: UserDto | null;
  setAccessToken: (accessToken: string) => void;
  signIn: (accessToken: string, user: UserDto) => void;
  setUser: (user: UserDto) => void;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  signIn: (accessToken, user) =>
    set({ status: 'authenticated', accessToken, user }),
  setUser: (user) => set({ user }),
  signOut: () => set({ status: 'anonymous', accessToken: null, user: null }),
}));

const NO_PERMISSIONS: readonly Permission[] = [];

/** What the signed-in user may do. It decides what is shown; the API enforces it. */
export const usePermissions = () =>
  useSessionStore((state) => state.user?.permissions ?? NO_PERMISSIONS);
