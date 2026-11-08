import { useCafesControllerCurrent } from '@/shared/api/generated/cafes/cafes';
import type { ProductDto } from '@/shared/api/generated/model';
import { amountsOf, chargesFor } from '@/shared/lib/order-charges';
import type { CartDraft, CartOrderType } from './cart-store';

const TILL_TYPES: readonly CartOrderType[] = ['DINE_IN', 'TAKEAWAY'];
const NO_CHARGES = { serviceChargePercent: 0, packagingFee: 0, deliveryFee: 0 };

/**
 * The kinds of order the cafe takes that the till can place, and the one this draft
 * really is: a draft started as dine-in becomes takeaway in a cafe without tables.
 */
export function useCartAmounts(
  draft: CartDraft,
  products: readonly ProductDto[],
) {
  const cafe = useCafesControllerCurrent().data;
  const offered = cafe
    ? TILL_TYPES.filter((type) => cafe.orderTypes.includes(type))
    : TILL_TYPES;
  const type: CartOrderType | undefined = offered.includes(draft.type)
    ? draft.type
    : offered[0];
  const itemsTotal = draft.lines.reduce((sum, line) => {
    const product = products.find(({ id }) => id === line.productId);
    return sum + (product?.price ?? 0) * line.quantity;
  }, 0);
  return {
    offered,
    type,
    amounts: amountsOf(
      itemsTotal,
      type && cafe ? chargesFor(type, cafe) : NO_CHARGES,
    ),
  };
}
