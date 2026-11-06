import { PaymentMethod } from '@/shared/api/generated/model';

export type SplitMethod = 'CASH' | 'CARD';
export type SplitAmounts = Record<SplitMethod, number>;

export const SPLIT_METHODS: readonly SplitMethod[] = ['CASH', 'CARD'];

export const otherMethod = (method: SplitMethod): SplitMethod =>
  method === 'CASH' ? 'CARD' : 'CASH';

export const startSplit = (unpaid: number): SplitAmounts => ({
  CASH: unpaid,
  CARD: 0,
});

/**
 * Moving to the other method hands it what is left. If the current one still holds
 * everything, the customer is simply paying the other way, so all of it moves across.
 */
export function moveTo(
  amounts: SplitAmounts,
  to: SplitMethod,
  unpaid: number,
): SplitAmounts {
  const from = otherMethod(to);
  if (amounts[from] >= unpaid) {
    return { [from]: 0, [to]: unpaid } as SplitAmounts;
  }
  return {
    [from]: amounts[from],
    [to]: unpaid - amounts[from],
  } as SplitAmounts;
}

/** Once the order is split, changing one amount keeps the two adding up to the whole. */
export function setAmount(
  amounts: SplitAmounts,
  method: SplitMethod,
  amount: number,
  unpaid: number,
): SplitAmounts {
  const other = otherMethod(method);
  return {
    [method]: amount,
    [other]: amounts[other] > 0 ? Math.max(0, unpaid - amount) : 0,
  } as SplitAmounts;
}

export const sumOf = ({ CASH, CARD }: SplitAmounts) => CASH + CARD;

export const toPayments = (amounts: SplitAmounts) =>
  SPLIT_METHODS.filter((method) => amounts[method] > 0).map((method) => ({
    method: PaymentMethod[method],
    amount: amounts[method],
  }));
