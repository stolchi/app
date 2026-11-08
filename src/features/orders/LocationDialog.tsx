import { ClipboardPaste, MapPin } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
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
import { formatPoint, parseLocation, type Point } from '@/shared/lib/geo';

const MapPicker = lazy(() => import('./MapPicker'));

function LocationForm({
  value,
  onDone,
}: {
  value: Point | null;
  onDone: (point: Point | null) => void;
}) {
  const { t } = useTranslation();
  const [point, setPoint] = useState(value);
  const [link, setLink] = useState('');
  const [unreadable, setUnreadable] = useState(false);

  const paste = () => {
    const found = parseLocation(link);
    setUnreadable(found === null);
    if (found) {
      setPoint(found);
      setLink('');
    }
  };

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          // React carries a submit through the portal to a form the dialog was opened from.
          event.stopPropagation();
          paste();
        }}
      >
        <Input
          aria-label={t('location.link')}
          placeholder={t('location.linkPlaceholder')}
          className="h-11 min-w-0 flex-1 text-base md:text-base"
          aria-invalid={unreadable || undefined}
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setUnreadable(false);
          }}
        />
        <Button
          type="submit"
          variant="outline"
          className="h-11"
          disabled={!link.trim()}
        >
          <ClipboardPaste />
          {t('location.put')}
        </Button>
      </form>
      {unreadable && (
        <p className="text-sm text-destructive">{t('location.unreadable')}</p>
      )}
      <Suspense
        fallback={
          <div className="h-[min(55dvh,26rem)] animate-pulse rounded-xl bg-muted" />
        }
      >
        <MapPicker
          value={point}
          onChange={setPoint}
          label={t('location.map')}
        />
      </Suspense>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" />
        {point ? formatPoint(point) : t('location.tapHint')}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        {value && (
          <Button
            variant="ghost"
            className="h-11 text-destructive hover:text-destructive"
            onClick={() => onDone(null)}
          >
            {t('location.remove')}
          </Button>
        )}
        <Button
          className="h-11 px-6"
          disabled={!point}
          onClick={() => onDone(point)}
        >
          {t('location.confirm')}
        </Button>
      </div>
    </div>
  );
}

/** The delivery point: tapped on the map, or read from a link the customer sent. */
export function LocationDialog({
  open,
  value,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  value: Point | null;
  onOpenChange: (open: boolean) => void;
  /** `null` takes the point off. */
  onPick: (point: Point | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('location.title')}</DialogTitle>
          <DialogDescription>{t('location.hint')}</DialogDescription>
        </DialogHeader>
        {open && (
          <LocationForm
            value={value}
            onDone={(point) => {
              onPick(point);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
