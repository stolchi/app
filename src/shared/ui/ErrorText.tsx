import { useTranslation } from 'react-i18next';
import { apiErrorKey } from '@/shared/api/errors';

/** Shows a failed API call in Uzbek. Renders nothing while there is no error. */
export function ErrorText({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {t(apiErrorKey(error))}
    </p>
  );
}
