import type { QueryClient } from '@tanstack/react-query';

export const ApiPath = {
  orders: '/api/v1/orders',
  dashboard: '/api/v1/dashboard',
  products: '/api/v1/products',
  categories: '/api/v1/categories',
  tables: '/api/v1/tables',
  cafe: '/api/v1/cafes/current',
  staff: '/api/v1/staff',
  couriers: '/api/v1/couriers',
} as const;

/** Refetches every query, lists and single items alike, under the given API paths. */
export function invalidate(queryClient: QueryClient, ...paths: string[]) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey: [key] }) =>
      typeof key === 'string' && paths.some((path) => key.startsWith(path)),
  });
}
