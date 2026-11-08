import type { OrderType } from '@/shared/api/generated/model';

/** What a cafe charges on top of the food. Mirrors the API, which has the final say. */
export interface Charges {
  serviceChargePercent: number;
  packagingFee: number;
  deliveryFee: number;
}

export interface Amounts extends Charges {
  itemsTotal: number;
  serviceCharge: number;
  total: number;
}

/** The part of the cafe's charges that applies to one kind of order. */
export const chargesFor = (type: OrderType, cafe: Charges): Charges => ({
  serviceChargePercent: type === 'DINE_IN' ? cafe.serviceChargePercent : 0,
  packagingFee: type === 'DINE_IN' ? 0 : cafe.packagingFee,
  deliveryFee: type === 'DELIVERY' ? cafe.deliveryFee : 0,
});

export function amountsOf(itemsTotal: number, charges: Charges): Amounts {
  const serviceCharge = Math.round(
    (itemsTotal * charges.serviceChargePercent) / 100,
  );
  return {
    itemsTotal,
    serviceChargePercent: charges.serviceChargePercent,
    serviceCharge,
    packagingFee: charges.packagingFee,
    deliveryFee: charges.deliveryFee,
    total:
      itemsTotal + serviceCharge + charges.packagingFee + charges.deliveryFee,
  };
}

/** Nothing on top of the food: the total alone says it all. */
export const hasCharges = (amounts: Charges & { serviceCharge: number }) =>
  amounts.serviceCharge + amounts.packagingFee + amounts.deliveryFee > 0;
