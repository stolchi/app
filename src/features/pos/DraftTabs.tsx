import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { itemCount } from '@/shared/lib/quantity';
import { cn } from '@/lib/utils';
import { useTables } from '@/features/orders/use-tables';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { activeDraft, useCartStore, type CartDraft } from './cart-store';

/** Lets one person serve several customers at once, moving between them at will. */
export function DraftTabs({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { tables } = useTables();
  const state = useCartStore();
  const { drafts, activeId, startNew, switchTo, remove } = state;
  const [removing, setRemoving] = useState<CartDraft | null>(null);

  const labelOf = (draft: CartDraft) =>
    tables.find(({ id }) => id === draft.tableId)?.name ??
    t('pos.draft', { number: draft.id });
  const countOf = (draft: CartDraft) => itemCount(draft.lines);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {drafts.map((draft) => {
          const isActive = draft.id === activeId;
          const count = countOf(draft);
          return (
            <span
              key={draft.id}
              className={cn(
                'flex h-11 shrink-0 items-center rounded-xl border text-sm font-medium',
                isActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'bg-card text-muted-foreground',
              )}
            >
              <button
                type="button"
                aria-pressed={isActive}
                className="flex h-full items-center gap-1.5 rounded-xl pl-3 pr-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => switchTo(draft.id)}
              >
                <span className="max-w-32 truncate">{labelOf(draft)}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
              {drafts.length > 1 && (
                <button
                  type="button"
                  aria-label={t('pos.removeDraft', { name: labelOf(draft) })}
                  className="-ml-1.5 flex size-9 items-center justify-center rounded-lg outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() =>
                    countOf(draft) > 0 ? setRemoving(draft) : remove(draft.id)
                  }
                >
                  <X className="size-4" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <Button
        variant="outline"
        className="h-11 shrink-0 px-3"
        disabled={activeDraft(state).lines.length === 0}
        onClick={startNew}
      >
        <Plus />
        {t('pos.newDraft')}
      </Button>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={t('pos.removeDraftQuestion', {
          name: removing ? labelOf(removing) : '',
        })}
        confirmLabel={t('common.delete')}
        pending={false}
        error={null}
        onConfirm={() => {
          if (removing) remove(removing.id);
          setRemoving(null);
        }}
      />
    </div>
  );
}
