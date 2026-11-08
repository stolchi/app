import { describe, expect, it } from 'vitest';
import { amountsOf, chargesFor, hasCharges } from './order-charges';

const cafe = {
  serviceChargePercent: 10,
  packagingFee: 2000,
  deliveryFee: 15000,
};

describe('order charges', () => {
  it('adds service to dine-in only', () => {
    expect(amountsOf(12_345, chargesFor('DINE_IN', cafe))).toEqual({
      itemsTotal: 12_345,
      serviceChargePercent: 10,
      serviceCharge: 1235,
      packagingFee: 0,
      deliveryFee: 0,
      total: 13_580,
    });
  });

  it('adds packaging to takeaway, and delivery on top for delivery', () => {
    expect(amountsOf(50_000, chargesFor('TAKEAWAY', cafe)).total).toBe(52_000);
    expect(amountsOf(50_000, chargesFor('DELIVERY', cafe)).total).toBe(67_000);
  });

  it('knows when there is nothing on top of the food', () => {
    const none = { serviceChargePercent: 0, packagingFee: 0, deliveryFee: 0 };
    expect(hasCharges(amountsOf(10_000, none))).toBe(false);
    expect(hasCharges(amountsOf(10_000, chargesFor('DINE_IN', cafe)))).toBe(
      true,
    );
  });
});
