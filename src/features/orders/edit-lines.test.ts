import {
  addProduct,
  addsFood,
  linesOf,
  setQuantity,
  toPayload,
  totalOf,
} from './edit-lines';

const order = {
  items: [
    {
      id: 'i1',
      productId: 'p1',
      name: 'Osh',
      price: 40000,
      quantity: 2,
      note: null,
      addedQuantity: 0,
    },
  ],
};
const choy = { id: 'p2', name: 'Choy', price: 5000 };

describe('editing order lines', () => {
  it('counts a repeated product on one new line', () => {
    const lines = addProduct(addProduct(linesOf(order), choy), choy);
    expect(lines).toHaveLength(2);
    expect(lines[1].quantity).toBe(2);
    expect(totalOf(lines)).toBe(2 * 40000 + 2 * 5000);
  });

  it('keeps an ordered line apart from a new one of the same product', () => {
    const lines = addProduct(linesOf(order), { ...order.items[0], id: 'p1' });
    expect(lines).toHaveLength(2);
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

  it('knows when food is added', () => {
    const lines = linesOf(order);
    expect(addsFood(order, lines)).toBe(false);
    expect(addsFood(order, setQuantity(lines, 'i1', 1))).toBe(false);
    expect(addsFood(order, setQuantity(lines, 'i1', 3))).toBe(true);
    expect(addsFood(order, addProduct(lines, choy))).toBe(true);
  });
});
