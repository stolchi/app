import { refreshAccessToken } from '@/shared/api/client';
import { authControllerMe } from '@/shared/api/generated/auth/auth';
import { useSessionStore } from './session-store';

/** Restores the session from the refresh cookie when the app opens. */
export async function restoreSession(): Promise<void> {
  const { setAccessToken, signIn, signOut } = useSessionStore.getState();
  try {
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      signOut();
      return;
    }
    setAccessToken(accessToken);
    signIn(accessToken, await authControllerMe());
  } catch {
    signOut();
  }
}
