import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { CafeDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SavedNote({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <span
      role="status"
      className="flex items-center gap-1 text-sm text-emerald-700"
    >
      <Check className="size-4" />
      {t('common.saved')}
    </span>
  );
}

/** Every settings form saves the same cafe, and everyone showing it hears at once. */
export function useCafeMutationOptions() {
  const queryClient = useQueryClient();
  return {
    mutation: {
      onSuccess: (cafe: CafeDto) => {
        queryClient.setQueryData([ApiPath.cafe], cafe);
        void invalidate(queryClient, ApiPath.cafe);
      },
    },
  };
}
