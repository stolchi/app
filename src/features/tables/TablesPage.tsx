import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Armchair,
  Download,
  FileDown,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { OrderDialog } from '@/features/orders/OrderDialog';
import { StatusBadge } from '@/features/orders/StatusBadge';
import { groupByZone, nextTableNumber } from '@/features/orders/table-search';
import { useTables } from '@/features/orders/use-tables';
import { useOrdersControllerList } from '@/shared/api/generated/orders/orders';
import type { TableDto } from '@/shared/api/generated/model';
import {
  tablesControllerQr,
  tablesControllerQrPdf,
  useTablesControllerCreate,
  useTablesControllerCreateMany,
  useTablesControllerRemove,
  useTablesControllerUpdate,
} from '@/shared/api/generated/tables/tables';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { saveBlob } from '@/shared/lib/assets';
import { formatMoney } from '@/shared/lib/format';
import { useHeldValue } from '@/shared/lib/use-held-value';
import { riseItem, staggerList } from '@/shared/motion/variants';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { Segmented } from '@/shared/ui/Segmented';

const MAX_BULK = 100;

const schema = z.object({
  name: z.string().trim().min(1, 'tables.errors.nameRequired').max(60),
});

type AddMode = 'one' | 'many';

function ManyTablesForm({
  existing,
  onDone,
}: {
  existing: readonly TableDto[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [prefix, setPrefix] = useState(t('tables.fields.defaultPrefix'));
  const [zone, setZone] = useState('');
  const [countText, setCountText] = useState('10');
  const [fromText, setFromText] = useState('');
  const create = useTablesControllerCreateMany({
    mutation: {
      onSuccess: () => {
        void invalidate(queryClient, ApiPath.tables);
        onDone();
      },
    },
  });

  const name = prefix.trim();
  const suggested = nextTableNumber(existing, name);
  const from = fromText ? Number(fromText) : suggested;
  const count = Number(countText);
  const valid =
    name !== '' &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= MAX_BULK &&
    Number.isInteger(from) &&
    from >= 1 &&
    from <= 9999;
  const digits = (value: string) => value.replace(/\D/g, '');

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || create.isPending) return;
        create.mutate({
          data: { prefix: name, from, count, zone: zone.trim() || null },
        });
      }}
    >
      <ZoneField
        id="many-zone"
        value={zone}
        onChange={setZone}
        tables={existing}
      />
      <FormField
        id="many-prefix"
        label={t('tables.fields.prefix')}
        value={prefix}
        maxLength={50}
        onChange={(event) => setPrefix(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="many-count"
          label={t('tables.fields.count')}
          inputMode="numeric"
          value={countText}
          onChange={(event) => setCountText(digits(event.target.value))}
        />
        <FormField
          id="many-from"
          label={t('tables.fields.from')}
          inputMode="numeric"
          placeholder={String(suggested)}
          value={fromText}
          onChange={(event) => setFromText(digits(event.target.value))}
        />
      </div>
      <p
        role="status"
        className={cn(
          'rounded-xl p-3 text-sm',
          valid
            ? 'bg-primary/10 font-medium'
            : 'bg-destructive/10 text-destructive',
        )}
      >
        {valid
          ? t('tables.bulkPreview', {
              first: `${name} ${from}`,
              last: `${name} ${from + count - 1}`,
              count,
            })
          : t('tables.errors.bulkInvalid', { max: MAX_BULK })}
      </p>
      <ErrorText error={create.error} />
      <Button
        type="submit"
        className="h-11 w-full text-base"
        disabled={!valid || create.isPending}
      >
        {t('tables.addMany', { count: valid ? count : 0 })}
      </Button>
    </form>
  );
}

function ZoneField({
  id,
  tables,
  value,
  onChange,
}: {
  id: string;
  tables: readonly TableDto[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const zones = [
    ...new Set(tables.flatMap(({ zone }) => (zone ? [zone] : []))),
  ];
  return (
    <>
      <FormField
        id={id}
        label={t('tables.fields.zone')}
        placeholder={t('tables.fields.zonePlaceholder')}
        list={`${id}-options`}
        maxLength={60}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={`${id}-options`}>
        {zones.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
    </>
  );
}

function OneTableForm({
  table,
  existing,
  onDone,
}: {
  table: TableDto | null;
  existing: readonly TableDto[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutation = {
    mutation: {
      onSuccess: () => {
        void invalidate(queryClient, ApiPath.tables);
        onDone();
      },
    },
  };
  const create = useTablesControllerCreate(mutation);
  const update = useTablesControllerUpdate(mutation);
  const [zone, setZone] = useState(table?.zone ?? '');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: table?.name ?? '' },
  });

  const onSubmit = handleSubmit(({ name }) => {
    const data = { name, zone: zone.trim() || null };
    if (table) update.mutate({ id: table.id, data });
    else create.mutate({ data });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        id="table-name"
        label={t('tables.fields.name')}
        placeholder={t('tables.fields.namePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />
      <ZoneField
        id="table-zone"
        value={zone}
        onChange={setZone}
        tables={existing}
      />
      <ErrorText error={create.error ?? update.error} />
      <Button
        type="submit"
        className="h-11 w-full text-base"
        disabled={create.isPending || update.isPending}
      >
        {t('common.save')}
      </Button>
    </form>
  );
}

function AddTablesBody({
  existing,
  onDone,
}: {
  existing: readonly TableDto[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AddMode>('one');
  return (
    <div className="min-w-0 space-y-4">
      <Segmented
        id="add-table-mode"
        value={mode}
        onChange={setMode}
        itemClassName="flex-1"
        options={[
          { value: 'one', label: t('tables.modeOne') },
          { value: 'many', label: t('tables.modeMany') },
        ]}
      />
      {mode === 'one' ? (
        <OneTableForm table={null} existing={existing} onDone={onDone} />
      ) : (
        <ManyTablesForm existing={existing} onDone={onDone} />
      )}
    </div>
  );
}

const safeFileName = (name: string) =>
  name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'stol';

export function TablesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { tables, query } = useTables();
  const orders = useOrdersControllerList({ active: true, limit: 100 });
  const ordersOn = (tableId: string) =>
    (orders.data?.items ?? []).filter((order) => order.tableId === tableId);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ table: TableDto | null } | null>(
    null,
  );
  const shownEditing = useHeldValue(editing);
  const [deleting, setDeleting] = useState<TableDto | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<unknown>(null);

  const remove = useTablesControllerRemove({
    mutation: {
      onSuccess: () => {
        setDeleting(null);
        void invalidate(queryClient, ApiPath.tables);
      },
    },
  });

  const download = async (key: string, run: () => Promise<void>) => {
    setDownloading(key);
    setDownloadError(null);
    try {
      await run();
    } catch (error) {
      setDownloadError(error);
    } finally {
      setDownloading(null);
    }
  };

  if (!query.data) {
    return (
      <QueryState
        isPending={query.isPending}
        error={query.error}
        refetch={query.refetch}
      />
    );
  }

  return (
    <Page
      title={t('nav.tables')}
      actions={
        <>
          <Button
            variant="outline"
            className="h-11"
            disabled={tables.length === 0 || downloading === 'pdf'}
            onClick={() =>
              void download('pdf', async () =>
                saveBlob(await tablesControllerQrPdf(), 'stolchi-qr.pdf'),
              )
            }
          >
            <FileDown />
            {t('tables.downloadAll')}
          </Button>
          <Button className="h-11" onClick={() => setEditing({ table: null })}>
            <Plus />
            {t('tables.add')}
          </Button>
        </>
      }
    >
      <ErrorText error={downloadError} />
      {tables.length === 0 ? (
        <EmptyState icon={Armchair}>{t('tables.empty')}</EmptyState>
      ) : (
        groupByZone(tables).map(({ zone, tables: inZone }) => (
          <section key={zone ?? 'none'} className="space-y-2">
            {zone && <h2 className="text-lg font-bold">{zone}</h2>}
            <motion.ul
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerList}
              initial="hidden"
              animate="shown"
            >
              {inZone.map((table) => (
                <motion.li
                  key={table.id}
                  layout
                  variants={riseItem}
                  whileHover={{ y: -3 }}
                  className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                        ordersOn(table.id).length > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      <Armchair className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-lg font-bold">
                        {table.name}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        ordersOn(table.id).length > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800',
                      )}
                    >
                      {t(
                        ordersOn(table.id).length > 0
                          ? 'tables.busy'
                          : 'tables.free',
                      )}
                    </span>
                  </div>
                  {ordersOn(table.id).length > 0 && (
                    <div className="space-y-1.5 rounded-xl bg-amber-50 p-2">
                      {ordersOn(table.id).map((order) => (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => setOpenOrderId(order.id)}
                          className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-card px-2.5 text-sm font-medium shadow-xs"
                        >
                          <span className="font-bold">
                            #{order.displayNumber}
                          </span>
                          <StatusBadge status={order.status} />
                          <span className="ml-auto whitespace-nowrap">
                            {formatMoney(order.total)}
                          </span>
                        </button>
                      ))}
                      <p className="px-1 text-xs text-amber-900">
                        {t('tables.freeHint')}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1"
                      disabled={downloading === table.id}
                      onClick={() =>
                        void download(table.id, async () =>
                          saveBlob(
                            await tablesControllerQr(table.id, {
                              format: 'png',
                            }),
                            `${safeFileName(table.name)}-qr.png`,
                          ),
                        )
                      }
                    >
                      <Download />
                      {t('tables.downloadQr')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="size-11"
                      aria-label={t('tables.editNamed', { name: table.name })}
                      onClick={() => setEditing({ table })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      className="size-11 text-destructive"
                      aria-label={t('tables.deleteNamed', { name: table.name })}
                      onClick={() => {
                        remove.reset();
                        setDeleting(table);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </section>
        ))
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(shownEditing?.table ? 'tables.edit' : 'tables.add')}
            </DialogTitle>
          </DialogHeader>
          {shownEditing?.table ? (
            <OneTableForm
              table={shownEditing.table}
              existing={tables}
              onDone={() => setEditing(null)}
            />
          ) : (
            <AddTablesBody existing={tables} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('tables.deleteQuestion', { name: deleting?.name })}
        description={t('tables.deleteNote')}
        confirmLabel={t('common.delete')}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
      <OrderDialog orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </Page>
  );
}
