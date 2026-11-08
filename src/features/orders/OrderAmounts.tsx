import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/shared/lib/format';
import { hasCharges, type Amounts } from '@/shared/lib/order-charges';
import { AnimatedNumber } from '@/shared/motion/AnimatedNumber';

/** The total, with what it is made of whenever the cafe charges more than the food. */
export function OrderAmounts({
  amounts,
  animated = false,
  className,
  size = 'normal',
}: {
  amounts: Amounts;
  animated?: boolean;
  className?: string;
  /** `large` is the till's: the total is what the cashier says out loud. */
  size?: 'normal' | 'large';
}) {
  const { t } = useTranslation();
  const money = (value: number) =>
    animated ? (
      <AnimatedNumber value={value} format={formatMoney} />
    ) : (
      formatMoney(value)
    );
  const parts = hasCharges(amounts)
    ? [
        {
          key: 'items',
          label: t('orders.amounts.items'),
          value: amounts.itemsTotal,
        },
        amounts.serviceCharge > 0 && {
          key: 'service',
          label: t('orders.amounts.service', {
            percent: amounts.serviceChargePercent,
          }),
          value: amounts.serviceCharge,
        },
        amounts.packagingFee > 0 && {
          key: 'packaging',
          label: t('orders.amounts.packaging'),
          value: amounts.packagingFee,
        },
        amounts.deliveryFee > 0 && {
          key: 'delivery',
          label: t('orders.amounts.delivery'),
          value: amounts.deliveryFee,
        },
      ].filter((part) => part !== false)
    : [];

  return (
    <dl className={cn('space-y-1 text-sm', className)}>
      {parts.map((part) => (
        <div
          key={part.key}
          className="flex justify-between gap-3 text-muted-foreground"
        >
          <dt>{part.label}</dt>
          <dd className="whitespace-nowrap">{money(part.value)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3">
        <dt
          className={
            size === 'large'
              ? 'font-medium text-muted-foreground'
              : 'text-base font-semibold'
          }
        >
          {t('orders.total')}
        </dt>
        <dd
          className={cn(
            'whitespace-nowrap',
            size === 'large'
              ? 'font-heading text-2xl font-bold'
              : 'text-base font-semibold',
          )}
        >
          {money(amounts.total)}
        </dd>
      </div>
    </dl>
  );
}
