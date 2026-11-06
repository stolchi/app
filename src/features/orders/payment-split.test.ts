import {
  moveTo,
  setAmount,
  startSplit,
  sumOf,
  toPayments,
} from './payment-split';

describe('splitting a payment', () => {
  it('starts with everything in cash', () => {
    expect(startSplit(200000)).toEqual({ CASH: 200000, CARD: 0 });
  });

  it('leaves the rest for the card once part is typed in cash', () => {
    const typed = setAmount(startSplit(200000), 'CASH', 120000, 200000);
    expect(moveTo(typed, 'CARD', 200000)).toEqual({
      CASH: 120000,
      CARD: 80000,
    });
  });

  it('moves everything over when nothing was split', () => {
    expect(moveTo(startSplit(200000), 'CARD', 200000)).toEqual({
      CASH: 0,
      CARD: 200000,
    });
  });

  it('moves everything back the same way', () => {
    const card = moveTo(startSplit(200000), 'CARD', 200000);
    expect(moveTo(card, 'CASH', 200000)).toEqual({ CASH: 200000, CARD: 0 });
  });

  it('keeps the split when going back and forth', () => {
    const typed = setAmount(startSplit(200000), 'CASH', 120000, 200000);
    const card = moveTo(typed, 'CARD', 200000);
    expect(moveTo(card, 'CASH', 200000)).toEqual(card);
  });

  it('adjusts the other amount while a split is changed', () => {
    const split = { CASH: 120000, CARD: 80000 };
    expect(setAmount(split, 'CARD', 50000, 200000)).toEqual({
      CASH: 150000,
      CARD: 50000,
    });
    expect(setAmount(split, 'CASH', 250000, 200000)).toEqual({
      CASH: 250000,
      CARD: 0,
    });
  });

  it('leaves a part unpaid when only one method was used', () => {
    const typed = setAmount(startSplit(200000), 'CASH', 120000, 200000);
    expect(sumOf(typed)).toBe(120000);
    expect(toPayments(typed)).toEqual([{ method: 'CASH', amount: 120000 }]);
  });

  it('sends both methods only when both hold money', () => {
    expect(toPayments({ CASH: 120000, CARD: 80000 })).toEqual([
      { method: 'CASH', amount: 120000 },
      { method: 'CARD', amount: 80000 },
    ]);
  });
});
