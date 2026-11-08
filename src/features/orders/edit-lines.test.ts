import type { OrderItemDto } from '@/shared/api/generated/model';
import {
  addProduct,
  addsFood,
  linesOf,
  needsWeighing,
  setQuantity,
  setWeight,
  toPayload,
  totalOf,
} from './edit-lines';

const item = (extra: Partial<OrderItemDto>): OrderItemDto => ({
  id: 'i1',
  productId: 'p1',
  variantId: null,
  name: 'Osh',
  price: 40000,
  unit: 'PIECE',
  quantity: 2,
  weighed: true,
  sendsToKitchen: true,
  note: null,
  addedQuantity: 0,
  ...extra,
});
const order = { items: [item({})] };
const product = (extra: object) => ({
  id: 'p2',
  name: 'Choy',
  price: 5000,
  unit: 'PIECE' as const,
  variants: [],
  sendsToKitchen: true,
  ...extra,
});
const choy = product({});

describe('editing order lines', () => {
  it('counts a repeated product on one new line', () => {
    const lines = addProduct(addProduct(linesOf(order), choy), choy);
    expect(lines).toHaveLength(2);
    expect(lines[1].quantity).toBe(2);
    expect(totalOf(lines)).toBe(2 * 40000 + 2 * 5000);
  });

  it('keeps an ordered line apart from a new one of the same product', () => {
    const lines = addProduct(
      linesOf(order),
      product({ id: 'p1', name: 'Osh' }),
    );
    expect(lines).toHaveLength(2);
  });

  it('keeps each size on its own line, named after it', () => {
    const osh = product({
      id: 'p3',
      name: 'Osh',
      variants: [
        { id: 'v1', name: '1', price: 45000 },
        { id: 'v2', name: '0,7', price: 35000 },
      ],
    });
    const lines = addProduct(addProduct([], osh, { variantId: 'v1' }), osh, {
      variantId: 'v2',
    });
    expect(lines.map((line) => [line.name, line.price])).toEqual([
      ['Osh (1)', 45000],
      ['Osh (0,7)', 35000],
    ]);
    expect(toPayload(lines)[1]).toEqual({
      productId: 'p3',
      variantId: 'v2',
      quantity: 1,
    });
  });

  it('prices weight per kilogram and confirms a guessed one', () => {
    const fish = item({
      id: 'f1',
      unit: 'KG',
      price: 120000,
      quantity: 1000,
      weighed: false,
    });
    const lines = linesOf({ items: [fish] });
    expect(needsWeighing(lines)).toBe(true);
    expect(toPayload(lines)).toEqual([{ id: 'f1', quantity: 1000 }]);

    const weighed = setWeight(lines, 'f1', 1250);
    expect(needsWeighing(weighed)).toBe(false);
    expect(totalOf(weighed)).toBe(150000);
    expect(toPayload(weighed)).toEqual([
      { id: 'f1', quantity: 1250, weighed: true },
    ]);
  });

  it('removes a line at zero', () => {
    expect(setQuantity(linesOf(order), 'i1', 0)).toEqual([]);
  });

  it('sends an id for ordered lines and a product for new ones', () => {
    const lines = addProduct(linesOf(order), choy);
    expect(toPayload(lines)).toEqual([
      { id: 'i1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ]);
  });

  it('knows when food is added, and that drinks are not food', () => {
    const lines = linesOf(order);
    expect(addsFood(order, lines)).toBe(false);
    expect(addsFood(order, setQuantity(lines, 'i1', 1))).toBe(false);
    expect(addsFood(order, setQuantity(lines, 'i1', 3))).toBe(true);
    expect(addsFood(order, addProduct(lines, choy))).toBe(true);
    expect(
      addsFood(order, addProduct(lines, product({ sendsToKitchen: false }))),
    ).toBe(false);
  });
});
