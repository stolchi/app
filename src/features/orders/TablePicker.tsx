import { Armchair, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useOrdersControllerList } from '@/shared/api/generated/orders/orders';
import { EmptyState } from '@/shared/ui/EmptyState';
import { groupByZone, searchTables } from './table-search';
import { useTables } from './use-tables';

function PickerBody({
  selectedId,
  disabledId,
  onSelect,
}: {
  selectedId?: string | null;
  /** The table an order is already on, when moving it. */
  disabledId?: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { tables } = useTables();
  const [query, setQuery] = useState('');
  const orders = useOrdersControllerList({ active: true, limit: 100 });

  const ordersOn = (tableId: string) =>
    (orders.data?.items ?? []).filter((order) => order.tableId === tableId);
  const candidates = tables.filter(({ id }) => id !== disabledId);
  const found = searchTables(candidates, query);

  if (tables.length === 0) {
    return <EmptyState icon={Armchair}>{t('tables.empty')}</EmptyState>;
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t('pos.searchTable')}
          placeholder={t('pos.searchTable')}
          className="h-11 rounded-xl pl-9 text-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && found[0]) {
              event.preventDefault();
              onSelect(found[0].id);
            }
          }}
        />
      </div>
      <div className="max-h-[55dvh] space-y-3 overflow-y-auto p-0.5">
        {found.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {t('pos.noTablesFound')}
          </p>
        )}
        {/* While searching, the best match stays first rather than in its zone. */}
        {(query.trim()
          ? [{ zone: null, tables: found }]
          : groupByZone(found)
        ).map(({ zone, tables: inZone }) => (
          <section key={zone ?? 'none'} className="space-y-1.5">
            {zone && (
              <h3 className="text-sm font-semibold text-muted-foreground">
                {zone}
              </h3>
            )}
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {inZone.map((table) => {
                const busy = ordersOn(table.id);
                return (
                  <li key={table.id}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      aria-pressed={table.id === selectedId}
                      onClick={() => onSelect(table.id)}
                      className={cn(
                        'flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        table.id === selectedId
                          ? 'border-primary bg-primary/10'
                          : busy.length > 0
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-border bg-card hover:border-primary/50',
                      )}
                    >
                      <Armchair
                        className={cn(
                          'size-5',
                          busy.length > 0
                            ? 'text-amber-600'
                            : 'text-emerald-600',
                        )}
                      />
                      <span className="max-w-full truncate font-semibold">
                        {table.name}
                      </span>
                      <span className="max-w-full truncate text-xs text-muted-foreground">
                        {busy.length > 0
                          ? `${t('pos.tableBusy')} · ${busy
                              .map((order) => `#${order.displayNumber}`)
                              .join(', ')}`
                          : t('pos.tableFree')}
                      </span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function TablePicker({
  open,
  onOpenChange,
  title,
  ...body
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  selectedId?: string | null;
  disabledId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-10 font-heading text-lg">
            {title}
          </DialogTitle>
        </DialogHeader>
        <PickerBody {...body} />
      </DialogContent>
    </Dialog>
  );
}
