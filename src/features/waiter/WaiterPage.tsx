import { PosPage } from '@/features/pos/PosPage';

/** Taking orders at the table: the menu and cart of the POS, for staff who take no money. */
export function WaiterPage() {
  return <PosPage variant="waiter" />;
}
