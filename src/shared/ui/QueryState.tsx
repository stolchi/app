import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { apiErrorKey } from '@/shared/api/errors';

interface QueryStateProps {
  isPending: boolean;
  error: unknown;
  refetch: () => unknown;
}

export function LoadingBlocks() {
  const { t } = useTranslation();
  return (
    <div role="status" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">{t('common.loading')}</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          aria-hidden
          className="h-28 animate-pulse rounded-2xl bg-muted"
        />
      ))}
    </div>
  );
}

/** The loading and failed states every page's data has. */
export function QueryState({ isPending, error, refetch }: QueryStateProps) {
  const { t } = useTranslation();
  if (isPending) return <LoadingBlocks />;
  return (
    <div role="alert" className="space-y-3 p-6 text-center">
      <p className="text-destructive">{t(apiErrorKey(error))}</p>
      <Button
        variant="outline"
        size="lg"
        className="h-11 px-5"
        onClick={() => refetch()}
      >
        {t('common.retry')}
      </Button>
    </div>
  );
}
