import { useQueryClient } from '@tanstack/react-query';
import { Bike } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCouriersControllerList,
  useOrdersControllerAssignCourier,
} from '@/shared/api/generated/orders/orders';
import type { OrderDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { celebrate } from '@/shared/ui/Celebration';
import { ErrorText } from '@/shared/ui/ErrorText';
import { Select } from '@/shared/ui/Select';

/** Who takes this delivery: one of the cafe's couriers, with how busy each one is. */
export function CourierPicker({
  order,
  disabled,
}: {
  order: OrderDto;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const couriers = useCouriersControllerList();
  const assign = useOrdersControllerAssignCourier({
    mutation: {
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.couriers),
    },
  });

  if (couriers.data?.length === 0 && !order.courier) {
    return (
      <p className="text-sm text-muted-foreground">{t('courier.noCouriers')}</p>
    );
  }
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
      >
        <Bike className="size-4" />
        {t('courier.assign')}
      </label>
      <Select
        id={id}
        value={order.courier?.id ?? ''}
        disabled={disabled || assign.isPending || !couriers.data}
        onChange={(event) => {
          const courierId = event.target.value || null;
          const name = couriers.data?.find((c) => c.id === courierId)?.name;
          assign.mutate(
            { id: order.id, data: { courierId } },
            {
              onSuccess: () => {
                if (name) {
                  celebrate(
                    t('courier.assigned', {
                      number: order.displayNumber,
                      name,
                    }),
                  );
                }
              },
            },
          );
        }}
      >
        <option value="">{t('courier.nobody')}</option>
        {/* Still shown if they left: the order keeps its courier. */}
        {order.courier &&
          !couriers.data?.some((c) => c.id === order.courier?.id) && (
            <option value={order.courier.id}>{order.courier.name}</option>
          )}
        {couriers.data?.map((courier) => (
          <option key={courier.id} value={courier.id}>
            {courier.activeDeliveries > 0
              ? t('courier.carrying', {
                  name: courier.name,
                  count: courier.activeDeliveries,
                })
              : courier.name}
          </option>
        ))}
      </Select>
      <ErrorText error={assign.error} />
    </div>
  );
}
