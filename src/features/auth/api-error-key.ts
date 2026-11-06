import { ApiError } from '@/shared/api/client';

/** Picks the i18n key to show for a failed login or registration. */
export function apiErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'auth.errors.invalidCredentials';
    if (error.status === 409 && error.message.includes('phone')) {
      return 'auth.errors.phoneTaken';
    }
    return 'common.errors.generic';
  }
  return 'common.errors.network';
}
