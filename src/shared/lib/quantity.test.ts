import { describe, expect, it } from 'vitest';
import {
  formatWeight,
  itemCount,
  kilosInput,
  lineTotal,
  parseKilos,
  quantityLabel,
} from './quantity';

describe('quantity', () => {
  it('prices weight per kilogram', () => {
    expect(lineTotal({ price: 120000, quantity: 1250, unit: 'KG' })).toBe(
      150000,
    );
    expect(lineTotal({ price: 5000, quantity: 3, unit: 'PIECE' })).toBe(15000);
  });

  it('shows weights the way people say them', () => {
    expect(formatWeight(350)).toBe('350 g');
    expect(formatWeight(1000)).toBe('1 kg');
    expect(formatWeight(1250)).toBe('1,25 kg');
    expect(quantityLabel('PIECE', 2)).toBe('2 ×');
    expect(kilosInput(1250)).toBe('1,25');
  });

  it('reads typed kilograms', () => {
    expect(parseKilos('1,25')).toBe(1250);
    expect(parseKilos(' 0.4 ')).toBe(400);
    expect(parseKilos('2')).toBe(2000);
    expect(parseKilos('0')).toBeNull();
    expect(parseKilos('1,2345')).toBeNull();
    expect(parseKilos('abc')).toBeNull();
    expect(parseKilos('101')).toBeNull();
  });

  it('counts a weighed line once', () => {
    expect(
      itemCount([
        { unit: 'PIECE', quantity: 2 },
        { unit: 'KG', quantity: 1500 },
      ]),
    ).toBe(3);
  });
});
