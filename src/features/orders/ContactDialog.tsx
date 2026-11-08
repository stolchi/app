import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOrdersControllerUpdateCustomer } from '@/shared/api/generated/orders/orders';
import type { OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { normalizePhone, PHONE_PATTERN } from '@/shared/lib/phone';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { LocationField } from './LocationField';

function ContactForm({
  order,
  onDone,
}: {
  order: OrderDto;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const delivery = order.type === 'DELIVERY';
  const [phone, setPhone] = useState(order.customerPhone ?? '');
  const [name, setName] = useState(order.customerName ?? '');
  const [address, setAddress] = useState(order.address ?? '');
  const [location, setLocation] = useState(order.location);
  const [checked, setChecked] = useState(false);
  const save = useOrdersControllerUpdateCustomer({
    mutation: {
      onSettled: () => invalidate(queryClient, ApiPath.orders),
    },
  });

  const normalPhone = phone.trim() ? normalizePhone(phone) : '';
  const phoneError =
    (normalPhone && !PHONE_PATTERN.test(normalPhone)) ||
    (delivery && !normalPhone)
      ? 'auth.errors.phoneInvalid'
      : undefined;
  const addressError =
    delivery && !address.trim() ? 'delivery.addressRequired' : undefined;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (phoneError || addressError) return;
        save.mutate(
          {
            id: order.id,
            data: {
              customerPhone: normalPhone || null,
              customerName: name.trim() || null,
              ...(delivery && { address: address.trim(), location }),
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="contact-phone"
          label={t('delivery.phone')}
          type="tel"
          inputMode="tel"
          error={checked ? phoneError : undefined}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <FormField
          id="contact-name"
          label={t('delivery.name')}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {delivery && (
        <div className="space-y-2">
          <Label htmlFor="contact-address">{t('delivery.address')}</Label>
          <Textarea
            id="contact-address"
            rows={3}
            maxLength={500}
            className="text-base"
            aria-invalid={(checked && addressError !== undefined) || undefined}
            placeholder={t('delivery.addressPlaceholder')}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          {checked && addressError && (
            <p className="text-sm text-destructive">{t(addressError)}</p>
          )}
          <LocationField value={location} onChange={setLocation} />
        </div>
      )}
      <ErrorText error={save.error} />
      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={save.isPending}
      >
        {t('common.save')}
      </Button>
    </form>
  );
}

/** The customer's details, as clarified on the phone. */
export function ContactDialog({
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('delivery.editContact', { number: order.displayNumber })}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <ContactForm order={order} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
