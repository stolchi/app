import { Permission } from '@/shared/api/generated/model';

const {
  DASHBOARD_VIEW,
  ORDERS_VIEW,
  ORDERS_CREATE,
  ORDERS_EDIT,
  ORDERS_CANCEL,
  ORDERS_SERVE,
  ORDERS_PAYMENT,
  KITCHEN_WORK,
  MENU_AVAILABILITY,
  MENU_MANAGE,
  TABLES_MANAGE,
  SETTINGS_MANAGE,
  STAFF_MANAGE,
} = Permission;

export const PERMISSION_GROUPS: readonly {
  id: 'orders' | 'kitchen' | 'menu' | 'management';
  permissions: readonly Permission[];
}[] = [
  {
    id: 'orders',
    permissions: [
      ORDERS_VIEW,
      ORDERS_CREATE,
      ORDERS_EDIT,
      ORDERS_CANCEL,
      ORDERS_SERVE,
      ORDERS_PAYMENT,
    ],
  },
  { id: 'kitchen', permissions: [KITCHEN_WORK] },
  { id: 'menu', permissions: [MENU_AVAILABILITY, MENU_MANAGE] },
  {
    id: 'management',
    permissions: [DASHBOARD_VIEW, TABLES_MANAGE, SETTINGS_MANAGE, STAFF_MANAGE],
  },
];

const NEEDS_VIEW: readonly Permission[] = [
  ORDERS_CREATE,
  ORDERS_EDIT,
  ORDERS_CANCEL,
  ORDERS_SERVE,
  ORDERS_PAYMENT,
];

/** Mirrors the backend: any work with orders needs seeing them. */
export function togglePermission(
  current: readonly Permission[],
  permission: Permission,
): Permission[] {
  if (!current.includes(permission)) {
    const added = [...current, permission];
    return NEEDS_VIEW.includes(permission) && !added.includes(ORDERS_VIEW)
      ? [...added, ORDERS_VIEW]
      : added;
  }
  return current.filter(
    (item) =>
      item !== permission &&
      !(permission === ORDERS_VIEW && NEEDS_VIEW.includes(item)),
  );
}
