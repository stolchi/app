import type {
  OrderDto,
  UpdateOrderItemDto,
} from '@/shared/api/generated/model';

/** One row of the edit form: a line on the order (`id`) or a new one (`productId`). */
export interface EditLine {
  key: string;
  id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
}

export const linesOf = (order: Pick<OrderDto, 'items'>): EditLine[] =>
  order.items.map((item) => ({
    key: item.id,
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    note: item.note ?? '',
  }));

/** Tapping a product again adds to its new line; lines already ordered stay as they are. */
export function addProduct(
  lines: readonly EditLine[],
  product: { id: string; name: string; price: number },
): EditLine[] {
  const index = lines.findIndex((line) => line.productId === product.id);
  if (index === -1) {
    return [
      ...lines,
      {
        key: `new-${product.id}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        note: '',
      },
    ];
  }
  return lines.map((line, i) =>
    i === index ? { ...line, quantity: line.quantity + 1 } : line,
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

export const totalOf = (lines: readonly EditLine[]) =>
  lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

export const toPayload = (lines: readonly EditLine[]): UpdateOrderItemDto[] =>
  lines.map(({ id, productId, quantity, note }) => ({
    ...(id ? { id } : { productId }),
    quantity,
    ...(note.trim() && { note: note.trim() }),
  }));

/** Whether saving would send something new to the kitchen. */
export function addsFood(
  order: Pick<OrderDto, 'items'>,
  lines: readonly EditLine[],
): boolean {
  return lines.some((line) => {
    if (!line.id) return true;
    const before = order.items.find((item) => item.id === line.id);
    return before !== undefined && line.quantity > before.quantity;
  });
}
