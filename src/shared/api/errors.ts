import { ApiError } from './client';

// The backend's English messages for errors the user can act on.
const KNOWN_MESSAGES: [pattern: RegExp, key: string][] = [
  [/products in this category/, 'menu.errors.categoryHasProducts'],
  [/is not available/, 'pos.errors.productUnavailable'],
  [/table with this name/, 'tables.errors.nameTaken'],
  [/not fully paid/, 'orders.errors.notFullyPaid'],
  [/less than what has been paid/, 'orders.errors.belowPaid'],
  [/role with this name/, 'staff.errors.roleNameTaken'],
  [/still has staff/, 'staff.errors.roleHasStaff'],
  [/at least one owner/, 'staff.errors.lastOwner'],
  [/already registered/, 'auth.errors.phoneTaken'],
  [/Only JPEG/, 'common.errors.badImage'],
];

/** Picks the i18n key to show for a failed API call. */
export function apiErrorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'common.errors.network';
  const known = KNOWN_MESSAGES.find(([pattern]) => pattern.test(error.message));
  if (known) return known[1];
  if (error.status === 403) return 'common.errors.forbidden';
  if (error.status === 413) return 'common.errors.imageTooLarge';
  if (error.status === 409) return 'common.errors.conflict';
  return 'common.errors.generic';
}
