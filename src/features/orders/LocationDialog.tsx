import { MapPin, Search } from 'lucide-react';
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
import { useGeoControllerSearch } from '@/shared/api/generated/geo/geo';
import { formatPoint, parseLocation, type Point } from '@/shared/lib/geo';
import { useDebounced } from '@/shared/lib/use-debounced';

const MapPicker = lazy(() => import('./MapPicker'));

/** Typing waits this long before searching, and searches from this many letters. */
const SEARCH_DELAY_MS = 500;
const SEARCH_MIN_LETTERS = 3;

function LocationForm({
  value,
  onDone,
}: {
  value: Point | null;
  onDone: (point: Point | null) => void;
}) {
  const { t } = useTranslation();
  const [point, setPoint] = useState(value);
  const [text, setText] = useState('');
  const [unreadable, setUnreadable] = useState(false);

  // A link or coordinates are read at once; anything else is a place name to look up.
  const pasted = parseLocation(text);
  const query = useDebounced(text.trim(), SEARCH_DELAY_MS);
  const searching =
    !pasted && query.length >= SEARCH_MIN_LETTERS && query === text.trim();
  const places = useGeoControllerSearch(
    {
      q: query,
      // Around the point already set, if any: most deliveries are near the cafe.
      ...(point && { latitude: point.latitude, longitude: point.longitude }),
    },
    { query: { enabled: searching, staleTime: Infinity, retry: false } },
  );

  // Only the point: a found place also carries its name, which an order does not take.
  const choose = ({ latitude, longitude }: Point) => {
    setPoint({ latitude, longitude });
    setText('');
    setUnreadable(false);
  };

  return (
    <div className="space-y-3">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          // React carries a submit through the portal to a form the dialog was opened from.
          event.stopPropagation();
          const first = places.data?.[0];
          if (pasted) choose(pasted);
          else if (searching && first) choose(first);
          else setUnreadable(text.trim() !== '');
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          role="combobox"
          aria-expanded={searching && (places.data?.length ?? 0) > 0}
          aria-controls="place-results"
          aria-label={t('location.search')}
          placeholder={t('location.searchPlaceholder')}
          className="h-11 pl-9 text-base md:text-base"
          aria-invalid={unreadable || undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setUnreadable(false);
          }}
        />
      </form>
      {searching && (
        <ul
          id="place-results"
          aria-label={t('location.results')}
          className="max-h-48 divide-y overflow-y-auto rounded-xl border"
        >
          {places.isFetching && !places.data && (
            <li className="p-3 text-sm text-muted-foreground">
              {t('location.searching')}
            </li>
          )}
          {places.isError && (
            <li className="p-3 text-sm text-destructive">
              {t('location.searchFailed')}
            </li>
          )}
          {places.data?.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              {t('location.nothingFound')}
            </li>
          )}
          {places.data?.map((place) => (
            <li key={`${place.latitude},${place.longitude}`}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="flex min-h-11 w-full items-start gap-2 p-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      )}
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
