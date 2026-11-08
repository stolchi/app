import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCafesControllerUpdate } from '@/shared/api/generated/cafes/cafes';
import type {
  CafeDto,
  DeliveryMode,
  OrderType,
} from '@/shared/api/generated/model';
import { LocationField } from '@/features/orders/LocationField';
import type { Point } from '@/shared/lib/geo';
import { formatAmountInput } from '@/shared/lib/format';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { SavedNote, useCafeMutationOptions } from './settings-parts';

const ALL_TYPES: readonly OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];

const DELIVERY_MODES: readonly DeliveryMode[] = ['OWN', 'NETWORK', 'BOTH'];

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
  const [deliveryFee, setDeliveryFee] = useState(
    formatAmountInput(cafe.deliveryFee),
  );
  const [mode, setMode] = useState<DeliveryMode>(cafe.deliveryMode);
  const [place, setPlace] = useState<Point | null>(cafe.location);
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
  const deliveryValue = parseWhole(deliveryFee);
  const deliveryError =
    deliveryValue === null || deliveryValue > MAX_MONEY
      ? 'settings.orders.amountInvalid'
      : undefined;
  const delivers = types.includes('DELIVERY');
  const noType = types.length === 0;
  // Taxi drivers find the cafe by its point on the map.
  const placeMissing = delivers && mode !== 'OWN' && !place;

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
        if (delivers && deliveryError) return;
        if (placeMissing) return;
        update.mutate({
          data: {
            orderTypes: types,
            serviceChargePercent: percentValue ?? 0,
            packagingFee: packagingValue ?? 0,
            ...(delivers && {
              deliveryFee: deliveryValue ?? 0,
              deliveryMode: mode,
              location: place,
            }),
          },
        });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t('settings.orders.types')}
        </legend>
        <div className="flex flex-wrap gap-x-6">
          {ALL_TYPES.map((type) => (
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
        {delivers && (
          <FormField
            id="delivery-fee"
            label={t('settings.orders.deliveryFee')}
            hint={t('settings.orders.deliveryFeeHint')}
            inputMode="numeric"
            error={checked ? deliveryError : undefined}
            value={deliveryFee}
            onChange={(event) => setDeliveryFee(event.target.value)}
          />
        )}
      </div>
      {delivers && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t('settings.orders.deliveryMode')}
            </legend>
            <div
              role="radiogroup"
              aria-label={t('settings.orders.deliveryMode')}
              className="grid gap-2 sm:grid-cols-3"
            >
              {DELIVERY_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={mode === option}
                  onClick={() => setMode(option)}
                  className="rounded-xl border border-border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-primary/5"
                >
                  <span className="block font-semibold">
                    {t(`settings.orders.mode.${option}`)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`settings.orders.modeHint.${option}`)}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t('settings.orders.cafeLocation')}
            </p>
            <LocationField value={place} onChange={setPlace} />
            <p
              className={
                checked && placeMissing
                  ? 'text-sm text-destructive'
                  : 'text-xs text-muted-foreground'
              }
            >
              {t(
                checked && placeMissing
                  ? 'settings.orders.cafeLocationRequired'
                  : 'settings.orders.cafeLocationHint',
              )}
            </p>
          </div>
        </>
      )}
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
