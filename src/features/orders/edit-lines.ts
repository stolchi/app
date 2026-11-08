import type {
  OrderDto,
  ProductDto,
  ProductUnit,
  UpdateOrderItemDto,
} from '@/shared/api/generated/model';
import { lineTotal } from '@/shared/lib/quantity';

/** One row of the edit form: a line on the order (`id`) or a new one (`productId`). */
export interface EditLine {
  key: string;
  id?: string;
  productId?: string;
  variantId?: string;
  name: string;
  /** Per kilogram for KG. */
  price: number;
  unit: ProductUnit;
  /** Pieces, or grams for KG. */
  quantity: number;
  /** False while a customer's guess at the weight waits for the scales. */
  weighed: boolean;
  sendsToKitchen: boolean;
  note: string;
}

export const linesOf = (order: Pick<OrderDto, 'items'>): EditLine[] =>
  order.items.map((item) => ({
    key: item.id,
    id: item.id,
    ...(item.variantId && { variantId: item.variantId }),
    name: item.name,
    price: item.price,
    unit: item.unit,
    quantity: item.quantity,
    weighed: item.weighed,
    sendsToKitchen: item.sendsToKitchen,
    note: item.note ?? '',
  }));

/**
 * Tapping a product again adds to its new line; lines already ordered stay as they are.
 * A weighed product comes with its weight, which replaces that of its new line.
 */
export function addProduct(
  lines: readonly EditLine[],
  product: Pick<
    ProductDto,
    'id' | 'name' | 'price' | 'unit' | 'variants' | 'sendsToKitchen'
  >,
  options: { variantId?: string; grams?: number } = {},
): EditLine[] {
  const variant = product.variants.find(({ id }) => id === options.variantId);
  const key = `new-${product.id}${variant ? `:${variant.id}` : ''}`;
  const index = lines.findIndex((line) => line.key === key);
  const weight = product.unit === 'KG' ? (options.grams ?? 1000) : undefined;
  if (index === -1) {
    return [
      ...lines,
      {
        key,
        productId: product.id,
        ...(variant && { variantId: variant.id }),
        name: variant ? `${product.name} (${variant.name})` : product.name,
        price: variant?.price ?? product.price,
        unit: product.unit,
        quantity: weight ?? 1,
        weighed: true,
        sendsToKitchen: product.sendsToKitchen,
        note: '',
      },
    ];
  }
  return lines.map((line, i) =>
    i === index ? { ...line, quantity: weight ?? line.quantity + 1 } : line,
  );
}

/** Going to zero takes the line off. */
export const setQuantity = (
  lines: readonly EditLine[],
  key: string,
  quantity: number,
): EditLine[] =>
  quantity <= 0
    ? lines.filter((line) => line.key !== key)
    : lines.map((line) => (line.key === key ? { ...line, quantity } : line));

/** What the scales said, which also settles a customer's guess. */
export const setWeight = (
  lines: readonly EditLine[],
  key: string,
  grams: number,
): EditLine[] =>
  lines.map((line) =>
    line.key === key ? { ...line, quantity: grams, weighed: true } : line,
  );

export const totalOf = (lines: readonly EditLine[]) =>
  lines.reduce((sum, line) => sum + lineTotal(line), 0);

export const needsWeighing = (lines: readonly EditLine[]) =>
  lines.some((line) => !line.weighed);

export const toPayload = (lines: readonly EditLine[]): UpdateOrderItemDto[] =>
  lines.map(({ id, productId, variantId, unit, weighed, quantity, note }) => ({
    ...(id ? { id } : { productId, ...(variantId && { variantId }) }),
    quantity,
    ...(id && unit === 'KG' && weighed && { weighed: true }),
    ...(note.trim() && { note: note.trim() }),
  }));

/** Whether saving would send something new to the kitchen. */
export function addsFood(
  order: Pick<OrderDto, 'items'>,
  lines: readonly EditLine[],
): boolean {
  return lines.some((line) => {
    if (!line.sendsToKitchen) return false;
    if (!line.id) return true;
    const before = order.items.find((item) => item.id === line.id);
    return before !== undefined && line.quantity > before.quantity;
  });
}
