import { Permission } from '@/shared/api/generated/model';
import { homePathFor, navItemsFor } from './nav';

const {
  DASHBOARD_VIEW,
  KITCHEN_WORK,
  MENU_MANAGE,
  ORDERS_CANCEL,
  ORDERS_CREATE,
  ORDERS_EDIT,
  ORDERS_PAYMENT,
  ORDERS_VIEW,
} = Permission;

const paths = (permissions: readonly Permission[]) =>
  navItemsFor(permissions).map((item) => item.path);

describe('permission-based menu', () => {
  it('shows an owner everything except the waiter screen', () => {
    expect(paths(Object.values(Permission))).toEqual([
      '/dashboard',
      '/pos',
      '/kitchen',
      '/orders',
      '/menu',
      '/tables',
      '/staff',
      '/settings',
    ]);
  });

  it('gives a cook only the kitchen', () => {
    expect(paths([KITCHEN_WORK])).toEqual(['/kitchen']);
    expect(homePathFor([KITCHEN_WORK])).toBe('/kitchen');
  });

  it('gives someone who takes orders but no money the waiter screen', () => {
    const waiter = [ORDERS_VIEW, ORDERS_CREATE, ORDERS_EDIT, ORDERS_CANCEL];
    expect(paths(waiter)).toEqual(['/waiter', '/orders']);
    expect(homePathFor(waiter)).toBe('/waiter');
  });

  it('gives whoever takes money the till instead', () => {
    const cashier = [
      DASHBOARD_VIEW,
      ORDERS_VIEW,
      ORDERS_CREATE,
      ORDERS_PAYMENT,
    ];
    expect(paths(cashier)).toEqual(['/dashboard', '/pos', '/orders']);
  });

  it('follows a custom role', () => {
    expect(paths([MENU_MANAGE])).toEqual(['/menu']);
  });

  it('has nothing for someone without permissions', () => {
    expect(paths([])).toEqual([]);
    expect(homePathFor([])).toBeUndefined();
  });

  it('shows delivery only to a cafe that has turned it on', () => {
    expect(navItemsFor([ORDERS_VIEW]).map((item) => item.path)).toEqual([
      '/orders',
    ]);
    expect(
      navItemsFor([ORDERS_VIEW], { delivery: true }).map((item) => item.path),
    ).toEqual(['/orders', '/delivery']);
  });

  it('has no page for a courier: they use the courier site', () => {
    expect(navItemsFor([Permission.DELIVERY_COURIER])).toEqual([]);
  });
});
