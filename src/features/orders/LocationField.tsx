import { Check, Map } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { Point } from '@/shared/lib/geo';
import { LocationDialog } from './LocationDialog';

/** Sets or shows the delivery point. */
export function LocationField({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (point: Point | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={value ? 'secondary' : 'outline'}
        className="h-11 w-full justify-between px-3 text-base"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          {value ? <Check className="text-emerald-700" /> : <Map />}
          {t(value ? 'location.picked' : 'location.pick')}
        </span>
        {value && (
          <span className="text-sm text-muted-foreground">
            {t('location.change')}
          </span>
        )}
      </Button>
      <LocationDialog
        open={open}
        value={value}
        onOpenChange={setOpen}
        onPick={onChange}
      />
    </>
  );
}
