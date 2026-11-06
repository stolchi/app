import { Permission } from '@/shared/api/generated/model';
import { PERMISSION_GROUPS, togglePermission } from './permission-groups';

const { KITCHEN_WORK, ORDERS_CREATE, ORDERS_PAYMENT, ORDERS_VIEW } = Permission;

describe('togglePermission', () => {
  it('turns on seeing orders along with any work on them', () => {
    expect(togglePermission([], ORDERS_CREATE).sort()).toEqual(
      [ORDERS_CREATE, ORDERS_VIEW].sort(),
    );
  });

  it('turns off work on orders along with seeing them', () => {
    expect(
      togglePermission(
        [ORDERS_VIEW, ORDERS_CREATE, ORDERS_PAYMENT, KITCHEN_WORK],
        ORDERS_VIEW,
      ),
    ).toEqual([KITCHEN_WORK]);
  });

  it('leaves seeing orders on when one kind of work is turned off', () => {
    expect(
      togglePermission([ORDERS_VIEW, ORDERS_CREATE], ORDERS_CREATE),
    ).toEqual([ORDERS_VIEW]);
  });

  it('offers every permission there is', () => {
    const offered = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect([...offered].sort()).toEqual(Object.values(Permission).sort());
  });
});
