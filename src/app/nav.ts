import {
  ChefHat,
  ClipboardList,
  ClipboardPen,
  LayoutDashboard,
  type LucideIcon,
  QrCode,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { Permission } from '@/shared/api/generated/model';

type Permissions = readonly Permission[];

export interface NavItem {
  path: string;
  /** An i18n key. */
  label: string;
  icon: LucideIcon;
  allowed: (permissions: Permissions) => boolean;
  /** Shown only to a cafe that has turned this on. */
  feature?: keyof CafeFeatures;
}

/** What a cafe has chosen to use, from its settings. */
export interface CafeFeatures {
  delivery: boolean;
}

const NO_FEATURES: CafeFeatures = { delivery: false };

const holds =
  (permission: Permission) =>
  (permissions: Permissions): boolean =>
    permissions.includes(permission);

const takesOrders = holds(Permission.ORDERS_CREATE);
const takesPayments = holds(Permission.ORDERS_PAYMENT);

/** Mirrors the backend's permissions. It decides what is shown; the API enforces it. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    path: '/dashboard',
    label: 'nav.dashboard',
    icon: LayoutDashboard,
    allowed: holds(Permission.DASHBOARD_VIEW),
  },
  {
    path: '/pos',
    label: 'nav.pos',
    icon: ShoppingCart,
    allowed: (permissions) =>
      takesOrders(permissions) && takesPayments(permissions),
  },
  {
    // The same job without the till, for whoever takes orders but not money.
    path: '/waiter',
    label: 'nav.waiter',
    icon: ClipboardPen,
    allowed: (permissions) =>
      takesOrders(permissions) && !takesPayments(permissions),
  },
  {
    path: '/kitchen',
    label: 'nav.kitchen',
    icon: ChefHat,
    allowed: holds(Permission.KITCHEN_WORK),
  },
  {
    path: '/orders',
    label: 'nav.orders',
    icon: ClipboardList,
    allowed: holds(Permission.ORDERS_VIEW),
  },
  {
    path: '/delivery',
    label: 'nav.delivery',
    icon: Truck,
    allowed: holds(Permission.ORDERS_VIEW),
    feature: 'delivery',
  },
  {
    path: '/menu',
    label: 'nav.menu',
    icon: UtensilsCrossed,
    allowed: holds(Permission.MENU_MANAGE),
  },
  {
    path: '/tables',
    label: 'nav.tables',
    icon: QrCode,
    allowed: holds(Permission.TABLES_MANAGE),
  },
  {
    path: '/staff',
    label: 'nav.staff',
    icon: Users,
    allowed: holds(Permission.STAFF_MANAGE),
  },
  {
    path: '/settings',
    label: 'nav.settings',
    icon: Settings,
    allowed: holds(Permission.SETTINGS_MANAGE),
  },
];

export const navItemsFor = (
  permissions: Permissions,
  features: CafeFeatures = NO_FEATURES,
) =>
  NAV_ITEMS.filter(
    (item) =>
      item.allowed(permissions) && (!item.feature || features[item.feature]),
  );

/** The first page a user can open is where they land after signing in. */
export const homePathFor = (permissions: Permissions) =>
  navItemsFor(permissions)[0]?.path;
