import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCafesControllerUpdate } from '@/shared/api/generated/cafes/cafes';
import type { CafeDto, OrderType } from '@/shared/api/generated/model';
import { formatAmountInput } from '@/shared/lib/format';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { SavedNote, useCafeMutationOptions } from './settings-parts';

const ALL_TYPES: readonly OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
/** Delivery joins this list once the till can take a delivery order. */
const EDITABLE_TYPES: readonly OrderType[] = ['DINE_IN', 'TAKEAWAY'];

const MAX_MONEY = 2_000_000_000;

const parseWhole = (value: string): number | null => {
  const digits = value.replace(/\s/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
};

export function OrderSettingsForm({ cafe }: { cafe: CafeDto }) {
  const { t } = useTranslation();
  const update = useCafesControllerUpdate(useCafeMutationOptions());
  const [types, setTypes] = useState<OrderType[]>(cafe.orderTypes);
  const [percent, setPercent] = useState(String(cafe.serviceChargePercent));
  const [packaging, setPackaging] = useState(
    formatAmountInput(cafe.packagingFee),
  );
  const [checked, setChecked] = useState(false);

  const percentValue = parseWhole(percent);
  const packagingValue = parseWhole(packaging);
  const percentError =
    percentValue === null || percentValue > 50
      ? 'settings.orders.percentInvalid'
      : undefined;
  const packagingError =
    packagingValue === null || packagingValue > MAX_MONEY
      ? 'settings.orders.amountInvalid'
      : undefined;
  const noType = types.length === 0;

  const toggle = (type: OrderType, on: boolean) =>
    setTypes((current) =>
      // Always in one order, so the till lists them the same way.
      ALL_TYPES.filter((other) =>
        other === type ? on : current.includes(other),
      ),
    );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (noType || percentError || packagingError) return;
        update.mutate({
          data: {
            orderTypes: types,
            serviceChargePercent: percentValue ?? 0,
            packagingFee: packagingValue ?? 0,
          },
        });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t('settings.orders.types')}
        </legend>
        <div className="flex flex-wrap gap-x-6">
          {EDITABLE_TYPES.map((type) => (
            <Label key={type} className="flex h-11 items-center gap-3">
              <Checkbox
                className="size-6"
                checked={types.includes(type)}
                onCheckedChange={(on) => toggle(type, on === true)}
              />
              {t(`orders.type.${type}`)}
            </Label>
          ))}
        </div>
        <p
          className={
            checked && noType
              ? 'text-sm text-destructive'
              : 'text-xs text-muted-foreground'
          }
        >
          {checked && noType
            ? t('settings.orders.typeRequired')
            : t('settings.orders.typesHint')}
        </p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="service-charge"
          label={t('settings.orders.serviceCharge')}
          hint={t('settings.orders.serviceChargeHint')}
          inputMode="numeric"
          error={checked ? percentError : undefined}
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
        />
        <FormField
          id="packaging-fee"
          label={t('settings.orders.packagingFee')}
          hint={t('settings.orders.packagingFeeHint')}
          inputMode="numeric"
          error={checked ? packagingError : undefined}
          value={packaging}
          onChange={(event) => setPackaging(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t('settings.orders.laterHint')}
      </p>
      <ErrorText error={update.error} />
      <div className="flex items-center gap-3">
        <Button type="submit" className="h-11 px-6" disabled={update.isPending}>
          {t('common.save')}
        </Button>
        <SavedNote visible={update.isSuccess} />
      </div>
    </form>
  );
}
