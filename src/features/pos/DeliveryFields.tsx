import { MapPin, Phone, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationField } from '@/features/orders/LocationField';
import { normalizePhone, PHONE_PATTERN } from '@/shared/lib/phone';
import type { CartDraft } from './cart-store';

type Customer = CartDraft['customer'];

/** A delivery taken on the phone needs a number to call back and an address. */
export const deliveryReady = (customer: Customer) =>
  PHONE_PATTERN.test(normalizePhone(customer.phone)) &&
  customer.address.trim() !== '';

export function DeliveryFields({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: (change: Partial<Customer>) => void;
}) {
  const { t } = useTranslation();
  const phoneTyped = customer.phone.trim() !== '';
  const phoneBad =
    phoneTyped && !PHONE_PATTERN.test(normalizePhone(customer.phone));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="relative block">
          <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="tel"
            inputMode="tel"
            aria-label={t('delivery.phone')}
            placeholder={t('delivery.phone')}
            aria-invalid={phoneBad || undefined}
            className="h-11 rounded-xl pl-9 text-base md:text-base"
            value={customer.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            onBlur={() => {
              if (phoneTyped)
                onChange({ phone: normalizePhone(customer.phone) });
            }}
          />
        </label>
        <label className="relative block">
          <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t('delivery.name')}
            placeholder={t('delivery.name')}
            maxLength={120}
            className="h-11 rounded-xl pl-9 text-base md:text-base"
            value={customer.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
      </div>
      <label className="relative block">
        <MapPin className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
        <Textarea
          rows={2}
          aria-label={t('delivery.address')}
          placeholder={t('delivery.addressPlaceholder')}
          maxLength={500}
          className="min-h-11 resize-none rounded-xl pl-9 text-base md:text-base"
          value={customer.address}
          onChange={(event) => onChange({ address: event.target.value })}
        />
      </label>
      <LocationField
        value={customer.location}
        onChange={(location) => onChange({ location })}
      />
      {phoneBad && (
        <p className="text-sm text-destructive">
          {t('auth.errors.phoneInvalid')}
        </p>
      )}
    </div>
  );
}
