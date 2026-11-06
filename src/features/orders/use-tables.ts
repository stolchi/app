import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTablesControllerList } from '@/shared/api/generated/tables/tables';
import type { OrderDto } from '@/shared/api/generated/model';
import { sortByName } from '@/shared/lib/format';

/** The cafe's tables in natural order, and how to name where an order goes. */
export function useTables() {
  const { t } = useTranslation();
  const query = useTablesControllerList();

  return useMemo(() => {
    const tables = sortByName(query.data ?? []);
    const placeOf = (order: Pick<OrderDto, 'tableId' | 'type'>) => {
      const table = tables.find(({ id }) => id === order.tableId);
      return table?.name ?? t(`orders.type.${order.type}`);
    };
    return { tables, placeOf, query };
  }, [query, t]);
}
