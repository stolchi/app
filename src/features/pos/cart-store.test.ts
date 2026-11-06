import { activeDraft, useCartStore } from './cart-store';

const store = () => useCartStore.getState();
const active = () => activeDraft(store());

describe('cart drafts', () => {
  beforeEach(() => store().clear());

  it('keeps each customer apart', () => {
    store().add('osh');
    store().setTableId('t1');
    store().startNew();
    expect(active().id).toBe(2);
    expect(active().lines).toEqual([]);
    expect(active().tableId).toBe('');

    store().add('choy');
    store().switchTo(1);
    expect(active().lines.map((line) => line.productId)).toEqual(['osh']);
    expect(active().tableId).toBe('t1');
  });

  it('adds to whoever is being served', () => {
    store().add('osh');
    store().startNew();
    store().add('osh');
    store().add('osh');
    store().switchTo(1);
    expect(active().lines[0].quantity).toBe(1);
  });

  it('carries on with the first customer once the second is sent', () => {
    store().add('osh');
    store().startNew();
    store().add('choy');
    store().remove(2);
    expect(store().drafts).toHaveLength(1);
    expect(active().id).toBe(1);
    expect(active().lines[0].productId).toBe('osh');
  });

  it('removes the right draft even if the user has moved on', () => {
    store().add('osh');
    store().startNew();
    store().add('choy');
    store().remove(1);
    expect(active().id).toBe(2);
    expect(active().lines[0].productId).toBe('choy');
  });

  it('always leaves a draft to work on', () => {
    store().add('osh');
    store().remove(1);
    expect(store().drafts).toHaveLength(1);
    expect(active().lines).toEqual([]);
  });

  it('does not stack up empty drafts', () => {
    store().startNew();
    store().startNew();
    expect(store().drafts).toHaveLength(1);

    store().add('osh');
    store().startNew();
    store().switchTo(1);
    expect(store().drafts.map((draft) => draft.id)).toEqual([1]);
  });

  it('reuses a freed number', () => {
    store().add('a');
    store().startNew();
    store().add('b');
    store().startNew();
    store().add('c');
    store().remove(2);
    store().startNew();
    expect(active().id).toBe(2);
    expect(store().drafts.map((draft) => draft.id)).toEqual([1, 2, 3]);
  });

  it('forgets everyone on clear', () => {
    store().add('a');
    store().startNew();
    store().add('b');
    store().clear();
    expect(store().drafts).toHaveLength(1);
    expect(active().lines).toEqual([]);
  });
});
