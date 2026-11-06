import { useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrdersControllerAddPayments } from '@/shared/api/generated/orders/orders';
import type { OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { formatAmountInput, formatMoney } from '@/shared/lib/format';
import { ErrorText } from '@/shared/ui/ErrorText';
import {
  moveTo,
  setAmount,
  SPLIT_METHODS,
  startSplit,
  sumOf,
  toPayments,
  type SplitMethod,
} from './payment-split';

const ICONS = { CASH: Banknote, CARD: CreditCard };

function PaymentForm({
  order,
  onDone,
}: {
  order: OrderDto;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const unpaid = order.total - order.paidAmount;
  const [method, setMethod] = useState<SplitMethod>('CASH');
  const [amounts, setAmounts] = useState(() => startSplit(unpaid));
  const pay = useOrdersControllerAddPayments();

  const sum = sumOf(amounts);
  const valid = sum >= 1 && sum <= unpaid;
  const leftAfter = unpaid - sum;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pay.isPending) return;
        pay.mutate(
          { id: order.id, data: { payments: toPayments(amounts) } },
          {
            onSuccess: onDone,
            // On failure too: someone else may have taken this payment already.
            onSettled: () =>
              invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
          },
        );
      }}
    >
      {order.payments.length > 0 && (
        <ul className="divide-y rounded-xl border text-sm">
          {order.payments.map((payment) => (
            <li key={payment.id} className="flex justify-between gap-3 p-2.5">
              <span>{t(`orders.method.${payment.method}`)}</span>
              <span className="font-medium">{formatMoney(payment.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        {t('orders.unpaid')}:{' '}
        <span className="font-semibold text-foreground">
          {formatMoney(unpaid)}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {SPLIT_METHODS.map((value) => {
          const Icon = ICONS[value];
          return (
            <Button
              key={value}
              type="button"
              variant={method === value ? 'default' : 'outline'}
              aria-pressed={method === value}
              className="h-16 flex-col gap-0.5 text-base"
              onClick={() => {
                if (value === method) return;
                setMethod(value);
                setAmounts(moveTo(amounts, value, unpaid));
              }}
            >
              <span className="flex items-center gap-2">
                <Icon />
                {t(`orders.method.${value}`)}
              </span>
              {amounts[value] > 0 && (
                <span className="text-sm font-normal tabular-nums">
                  {formatMoney(amounts[value])}
                </span>
              )}
            </Button>
          );
        })}
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment-amount">
          {t('orders.amountBy', { method: t(`orders.method.${method}`) })}
        </Label>
        <Input
          id="payment-amount"
          inputMode="numeric"
          className="h-12 text-lg"
          aria-invalid={!valid}
          value={formatAmountInput(amounts[method])}
          onChange={(event) =>
            setAmounts(
              setAmount(
                amounts,
                method,
                Number(event.target.value.replace(/\D/g, '')),
                unpaid,
              ),
            )
          }
        />
        {!valid && (
          <p className="text-sm text-destructive">
            {t('orders.errors.badAmount', { max: formatMoney(unpaid) })}
          </p>
        )}
        {valid && leftAfter > 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            {t('orders.restLater', { amount: formatMoney(leftAfter) })}
          </p>
        )}
      </div>
      <ErrorText error={pay.error} />
      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={!valid || pay.isPending}
      >
        {t('orders.takePayment')}
      </Button>
    </form>
  );
}

export function PaymentDialog({
  order,
  open,
  onOpenChange,
}: {
  order: OrderDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('orders.paymentTitle', { number: order.displayNumber })}
          </DialogTitle>
        </DialogHeader>
        <PaymentForm order={order} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
