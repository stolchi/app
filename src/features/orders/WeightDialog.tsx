import { Scale } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/shared/lib/format';
import { kilosInput, lineTotal, parseKilos } from '@/shared/lib/quantity';

/** Asks what the scales say. Kilograms are typed, grams are kept. */
function WeightForm({
  name,
  pricePerKg,
  grams,
  onDone,
}: {
  name: string;
  pricePerKg: number;
  grams: number | null;
  onDone: (grams: number) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(grams ? kilosInput(grams) : '');
  const [checked, setChecked] = useState(false);
  const parsed = parseKilos(text);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (parsed !== null) onDone(parsed);
      }}
    >
      <DialogDescription>
        {t('weight.perKg', { name, price: formatMoney(pricePerKg) })}
      </DialogDescription>
      <div className="relative">
        <Input
          autoFocus
          inputMode="decimal"
          aria-label={t('weight.kilos')}
          placeholder="1,25"
          className="h-14 pr-12 text-2xl font-bold md:text-2xl"
          aria-invalid={checked && parsed === null ? true : undefined}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-lg text-muted-foreground">
          kg
        </span>
      </div>
      {checked && parsed === null ? (
        <p className="text-sm text-destructive">{t('weight.invalid')}</p>
      ) : (
        <p className="flex justify-between text-base">
          <span className="text-muted-foreground">{t('orders.total')}</span>
          <span className="font-semibold">
            {formatMoney(
              lineTotal({
                price: pricePerKg,
                quantity: parsed ?? 0,
                unit: 'KG',
              }),
            )}
          </span>
        </p>
      )}
      <Button type="submit" className="h-12 w-full text-base">
        <Scale />
        {t('weight.confirm')}
      </Button>
    </form>
  );
}

export function WeightDialog({
  target,
  onClose,
  onDone,
}: {
  /** What is being weighed; `grams` is the weight so far, if any. */
  target: { name: string; pricePerKg: number; grams: number | null } | null;
  onClose: () => void;
  onDone: (grams: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('weight.title', { name: target?.name })}</DialogTitle>
        </DialogHeader>
        {target && (
          <WeightForm
            name={target.name}
            pricePerKg={target.pricePerKg}
            grams={target.grams}
            onDone={(grams) => {
              onDone(grams);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
