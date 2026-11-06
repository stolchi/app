import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrdersControllerList } from '@/shared/api/generated/orders/orders';
import { OrderSource } from '@/shared/api/generated/model';
import {
  formatDateTime,
  formatMoney,
  todayInTashkent,
} from '@/shared/lib/format';
import { riseItem, staggerList } from '@/shared/motion/variants';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { Segmented } from '@/shared/ui/Segmented';
import { Select } from '@/shared/ui/Select';
import { ACTIVE_QUERY, ActiveOrders } from './ActiveOrders';
import { OrderDialog } from './OrderDialog';
import { SourceBadge } from './SourceBadge';
import { StatusBadge } from './StatusBadge';
import { useTables } from './use-tables';

const PAGE_SIZE = 25;

type HistoryStatus = 'all' | 'PAID' | 'CANCELLED';

function OrderHistory({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const { tables, placeOf } = useTables();
  const [date, setDate] = useState(todayInTashkent);
  const [status, setStatus] = useState<HistoryStatus>('all');
  const [source, setSource] = useState<OrderSource | ''>('');
  const [tableId, setTableId] = useState('');
  const [page, setPage] = useState(1);

  const orders = useOrdersControllerList({
    ...(date && { date }),
    active: false,
    ...(status !== 'all' && { status }),
    ...(source && { source }),
    ...(tableId && { tableId }),
    page,
    limit: PAGE_SIZE,
  });
  const lastPage = Math.max(
    1,
    Math.ceil((orders.data?.total ?? 0) / PAGE_SIZE),
  );

  /** Any new filter starts again from the first page. */
  const filter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  return (
    <>
      <Segmented
        id="orders-status"
        tone="solid"
        label={t('orders.filters.status')}
        className="w-max"
        value={status}
        onChange={filter(setStatus)}
        options={[
          { value: 'all', label: t('orders.filters.allStatuses') },
          { value: 'PAID', label: t('orders.status.PAID') },
          { value: 'CANCELLED', label: t('orders.status.CANCELLED') },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-date">{t('orders.filters.date')}</Label>
          <Input
            id="filter-date"
            type="date"
            className="h-11 rounded-xl bg-card text-base"
            value={date}
            onChange={(event) => filter(setDate)(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-source">{t('orders.filters.source')}</Label>
          <Select
            id="filter-source"
            value={source}
            onChange={(event) =>
              filter(setSource)(event.target.value as OrderSource | '')
            }
          >
            <option value="">{t('orders.filters.all')}</option>
            {Object.values(OrderSource).map((value) => (
              <option key={value} value={value}>
                {t(`orders.source.${value}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-table">{t('orders.filters.table')}</Label>
          <Select
            id="filter-table"
            value={tableId}
            onChange={(event) => filter(setTableId)(event.target.value)}
          >
            <option value="">{t('orders.filters.all')}</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!orders.data ? (
        <QueryState
          isPending={orders.isPending}
          error={orders.error}
          refetch={orders.refetch}
        />
      ) : orders.data.items.length === 0 ? (
        <EmptyState icon={ClipboardList}>
          {t('orders.history.empty')}
        </EmptyState>
      ) : (
        <>
          <motion.ul
            key={`${page}-${status}-${source}-${tableId}-${date}`}
            className="space-y-2 md:hidden"
            variants={staggerList}
            initial="hidden"
            animate="shown"
          >
            {orders.data.items.map((order) => (
              <motion.li key={order.id} variants={riseItem}>
                <button
                  type="button"
                  onClick={() => onOpen(order.id)}
                  className="w-full space-y-1 rounded-2xl border bg-card p-3 text-left shadow-xs active:scale-[0.99]"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-heading text-lg font-bold">
                        {t('orders.title', { number: order.displayNumber })}
                      </span>
                      <SourceBadge source={order.source} />
                    </span>
                    <StatusBadge status={order.status} />
                  </span>
                  <span className="flex justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {placeOf(order)} · {t(`orders.source.${order.source}`)} ·{' '}
                      {formatDateTime(order.createdAt)}
                    </span>
                    <span className="font-medium whitespace-nowrap text-foreground">
                      {formatMoney(order.total)}
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
          <div className="hidden rounded-2xl border bg-card shadow-xs md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>{t('orders.columns.time')}</TableHead>
                  <TableHead>{t('orders.columns.place')}</TableHead>
                  <TableHead>{t('orders.columns.source')}</TableHead>
                  <TableHead>{t('orders.columns.status')}</TableHead>
                  <TableHead className="text-right">
                    {t('orders.total')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.items.map((order) => (
                  <TableRow
                    key={order.id}
                    className="h-12 cursor-pointer transition-colors hover:bg-primary/5"
                    tabIndex={0}
                    onClick={() => onOpen(order.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onOpen(order.id);
                    }}
                  >
                    <TableCell className="font-medium">
                      {order.displayNumber}
                    </TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>{placeOf(order)}</TableCell>
                    <TableCell>
                      {order.source === 'POS' ? (
                        t('orders.source.POS')
                      ) : (
                        <SourceBadge source={order.source} />
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatMoney(order.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-muted-foreground">
              {t('orders.pageOf', { page, lastPage })}
            </span>
            <Button
              variant="outline"
              className="size-11"
              aria-label={t('orders.previousPage')}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-11"
              aria-label={t('orders.nextPage')}
              disabled={page >= lastPage}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export function OrdersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [openId, setOpenId] = useState<string | null>(null);
  const active = useOrdersControllerList(ACTIVE_QUERY);
  const count = active.data?.items.length ?? 0;

  return (
    <Page title={t('nav.orders')}>
      <Segmented
        id="orders-tab"
        className="w-max"
        value={tab}
        onChange={setTab}
        options={[
          {
            value: 'active',
            label:
              count > 0
                ? `${t('orders.tabs.active')} (${count})`
                : t('orders.tabs.active'),
          },
          { value: 'history', label: t('orders.tabs.history') },
        ]}
      />
      {tab === 'active' ? (
        <ActiveOrders onOpen={setOpenId} />
      ) : (
        <OrderHistory onOpen={setOpenId} />
      )}
      <OrderDialog orderId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
