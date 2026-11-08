import { useCafesControllerCurrent } from '@/shared/api/generated/cafes/cafes';
import type { ProductDto } from '@/shared/api/generated/model';
import { amountsOf, chargesFor } from '@/shared/lib/order-charges';
import { lineTotal } from '@/shared/lib/quantity';
import type { CartDraft, CartLine, CartOrderType } from './cart-store';

const TILL_TYPES: readonly CartOrderType[] = ['DINE_IN', 'TAKEAWAY'];
const NO_CHARGES = { serviceChargePercent: 0, packagingFee: 0, deliveryFee: 0 };

/**
 * A cart line with its name and price from the live menu, or null once the product,
 * or its size, is gone.
 */
export function resolveLine(line: CartLine, products: readonly ProductDto[]) {
  const product = products.find(({ id }) => id === line.productId);
  if (!product) return null;
  const variant = line.variantId
    ? product.variants.find(({ id }) => id === line.variantId)
    : undefined;
  if (line.variantId ? !variant : product.variants.length > 0) return null;
  if (product.unit !== line.unit) return null;
  const price = variant?.price ?? product.price;
  return {
    ...line,
    product,
    name: variant ? `${product.name} (${variant.name})` : product.name,
    price,
    total: lineTotal({ price, quantity: line.quantity, unit: line.unit }),
  };
}

export type ResolvedLine = NonNullable<ReturnType<typeof resolveLine>>;

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
  const lines = draft.lines.flatMap((line) => {
    const resolved = resolveLine(line, products);
    return resolved ? [resolved] : [];
  });
  const itemsTotal = lines.reduce((sum, line) => sum + line.total, 0);
  return {
    lines,
    offered,
    type,
    amounts: amountsOf(
      itemsTotal,
      type && cafe ? chargesFor(type, cafe) : NO_CHARGES,
    ),
  };
}
