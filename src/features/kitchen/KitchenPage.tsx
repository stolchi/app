import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  Flame,
  Hourglass,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useState, type ComponentProps, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatWeight, quantityLabel } from '@/shared/lib/quantity';
import { cn } from '@/lib/utils';
import { maySetStatus, stepsTo } from '@/features/orders/order-rules';
import { SourceBadge } from '@/features/orders/SourceBadge';
import { useTables } from '@/features/orders/use-tables';
import {
  ordersControllerChangeStatus,
  useOrdersControllerList,
} from '@/shared/api/generated/orders/orders';
import {
  OrderStatus,
  type OrderDto,
  type Permission,
} from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions } from '@/shared/auth/session-store';
import { playChime } from '@/shared/lib/chime';
import { useMinutesSince } from '@/shared/lib/use-minutes-since';
import { useSocketEvent } from '@/shared/realtime/RealtimeProvider';
import { ErrorText } from '@/shared/ui/ErrorText';
import { QueryState } from '@/shared/ui/QueryState';
import { SoundHint } from '@/shared/ui/SoundHint';

const { NEW, ACCEPTED, COOKING, READY, SERVED } = OrderStatus;

interface Column {
  id: 'new' | 'cooking' | 'ready';
  icon: LucideIcon;
  accent: string;
  statuses: readonly OrderStatus[];
  /** The status an order gets on arriving in this column. */
  target: OrderStatus;
  /** The next column's status, or for the last column what comes after it. */
  moveTo: OrderStatus;
}

const COLUMNS: readonly Column[] = [
  {
    id: 'new',
    icon: Bell,
    accent: 'bg-primary/15 text-primary',
    statuses: [NEW, ACCEPTED],
    target: NEW,
    moveTo: COOKING,
  },
  {
    id: 'cooking',
    icon: Flame,
    accent: 'bg-amber-100 text-amber-700',
    statuses: [COOKING],
    target: COOKING,
    moveTo: READY,
  },
  {
    id: 'ready',
    icon: CheckCircle2,
    accent: 'bg-emerald-100 text-emerald-700',
    statuses: [READY],
    target: READY,
    moveTo: SERVED,
  },
];

const columnOf = (status: OrderStatus) =>
  COLUMNS.find((column) => column.statuses.includes(status));

/** Whether an order can go straight to `target`, one column forward, for this user. */
function canMove(
  status: OrderStatus,
  target: OrderStatus,
  permissions: readonly Permission[],
) {
  return (
    columnOf(status)?.moveTo === target &&
    stepsTo(status, target).every((step) => maySetStatus(permissions, step))
  );
}

/** The timer changes colour the longer an order waits, always with its number. */
const waitColor = (minutes: number) =>
  minutes < 10
    ? 'bg-emerald-100 text-emerald-800'
    : minutes < 20
      ? 'bg-amber-100 text-amber-800'
      : 'animate-pulse bg-red-100 text-red-800';

interface CardProps extends ComponentProps<'article'> {
  order: OrderDto;
  place: string;
  minutes: number;
  moveTarget: OrderStatus | null;
  onMove?: (order: OrderDto, target: OrderStatus) => void;
  cardRef?: Ref<HTMLElement>;
}

function OrderCard({
  order,
  place,
  minutes,
  moveTarget,
  onMove,
  cardRef,
  className,
  ...rest
}: CardProps) {
  const { t } = useTranslation();
  return (
    <article
      ref={cardRef}
      className={cn(
        'space-y-2 rounded-2xl border bg-card p-3 shadow-sm select-none [-webkit-touch-callout:none]',
        moveTarget && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <h3 className="font-heading text-2xl font-bold">
            {t('orders.title', { number: order.displayNumber })}
          </h3>
          <SourceBadge source={order.source} />
        </span>
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            waitColor(minutes),
          )}
        >
          <Hourglass className="size-3" />
          {t('kitchen.minutes', { minutes })}
        </span>
      </div>
      <p className="font-semibold">{place}</p>
      <ul className="space-y-1 border-t pt-2">
        {/* Drinks and bread are handed over at the counter: not the kitchen's. */}
        {order.items
          .filter((item) => item.sendsToKitchen)
          .map((item) => (
            <li key={item.id} className="text-base">
              <span className="font-bold">
                {quantityLabel(item.unit, item.quantity)}
              </span>{' '}
              {item.name}
              {item.addedQuantity > 0 && (
                <span className="ml-1.5 rounded-md bg-amber-200 px-1.5 py-0.5 text-sm font-bold text-amber-900">
                  {item.unit === 'KG'
                    ? t('kitchen.addedWeight', {
                        weight: formatWeight(item.addedQuantity),
                      })
                    : t('kitchen.added', { count: item.addedQuantity })}
                </span>
              )}
              {item.note && (
                <span className="mt-0.5 block w-fit rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary">
                  {item.note}
                </span>
              )}
            </li>
          ))}
      </ul>
      {order.note && (
        <p className="text-sm font-medium text-primary">{order.note}</p>
      )}
      {moveTarget && (
        <Button
          className="h-12 w-full text-base"
          onClick={() => onMove?.(order, moveTarget)}
        >
          {t(`kitchen.move.${moveTarget}`)}
        </Button>
      )}
    </article>
  );
}

function DraggableCard(props: CardProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: props.order.id,
    disabled: !props.moveTarget,
  });
  return (
    <OrderCard
      {...props}
      {...listeners}
      {...attributes}
      role={undefined}
      tabIndex={undefined}
      cardRef={setNodeRef}
      className={cn(isDragging && 'opacity-30')}
    />
  );
}

function KitchenColumn({
  column,
  count,
  droppable,
  children,
}: {
  column: Column;
  count: number;
  droppable: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;
  return (
    <section
      ref={setNodeRef}
      aria-label={t(`kitchen.columns.${column.id}`)}
      className={cn(
        'flex min-h-32 flex-col gap-3 md:min-h-48 rounded-3xl bg-muted p-3 transition-shadow',
        droppable && 'ring-2 ring-primary/30 ring-dashed',
        droppable && isOver && 'bg-primary/10 ring-3 ring-primary',
      )}
    >
      <h2 className="flex items-center gap-2 font-bold">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl',
            column.accent,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="flex-1">{t(`kitchen.columns.${column.id}`)}</span>
        <motion.span
          key={count}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          className="flex size-8 items-center justify-center rounded-full bg-card text-sm shadow-xs"
        >
          {count}
        </motion.span>
      </h2>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}

export function KitchenPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const { placeOf } = useTables();
  const orders = useOrdersControllerList({ active: true, limit: 100 });
  const minutesSince = useMinutesSince();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Shown right away, until the server has confirmed the move.
  const [moving, setMoving] = useState<Record<string, OrderStatus>>({});

  useSocketEvent('order.created', playChime);
  useSocketEvent('order.items_added', playChime);

  const move = useMutation({
    mutationFn: async ({
      order,
      target,
    }: {
      order: OrderDto;
      target: OrderStatus;
    }) => {
      // New orders are accepted and started in a single move.
      const current =
        orders.data?.items.find(({ id }) => id === order.id)?.status ??
        order.status;
      for (const status of stepsTo(current, target)) {
        await ordersControllerChangeStatus(order.id, { status });
      }
    },
    onMutate: ({ order, target }) =>
      setMoving((current) => ({ ...current, [order.id]: target })),
    onSettled: async (_data, _error, { order }) => {
      await invalidate(queryClient, ApiPath.orders, ApiPath.dashboard);
      setMoving((current) => {
        const rest = { ...current };
        delete rest[order.id];
        return rest;
      });
    },
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Holding first keeps a quick swipe scrolling the page, as it should.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  if (!orders.data) {
    return (
      <QueryState
        isPending={orders.isPending}
        error={orders.error}
        refetch={orders.refetch}
      />
    );
  }

  // Oldest first: they have been waiting the longest.
  const shown = orders.data.items
    // An order of drinks alone has nothing for the kitchen to do.
    .filter((order) => order.items.some((item) => item.sendsToKitchen))
    .map((order) => ({ ...order, status: moving[order.id] ?? order.status }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dragged = shown.find(({ id }) => id === draggingId);

  const moveTargetOf = (order: OrderDto) => {
    const target = columnOf(order.status)?.moveTo;
    return target && canMove(order.status, target, permissions) ? target : null;
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    const order = shown.find(({ id }) => id === active.id);
    const column = COLUMNS.find(({ id }) => id === over?.id);
    if (order && column && canMove(order.status, column.target, permissions)) {
      move.mutate({ order, target: column.target });
    }
  };

  return (
    // Columns do not scroll on their own: a card flying between two of them
    // must not get cut off at the edge of a scrolling column.
    <motion.div layoutScroll className="h-full overflow-y-auto p-3">
      <ErrorText error={move.error} />
      <SoundHint />
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDraggingId(String(active.id))}
        onDragCancel={() => setDraggingId(null)}
        onDragEnd={onDragEnd}
      >
        <LayoutGroup>
          <div className="grid gap-3 md:min-h-full md:grid-cols-3">
            {COLUMNS.map((column) => {
              const inColumn = shown.filter((order) =>
                column.statuses.includes(order.status),
              );
              return (
                <KitchenColumn
                  key={column.id}
                  column={column}
                  count={inColumn.length}
                  droppable={
                    dragged !== undefined &&
                    canMove(dragged.status, column.target, permissions)
                  }
                >
                  <AnimatePresence initial={false}>
                    {inColumn.map((order) => (
                      <motion.div
                        key={order.id}
                        layoutId={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 28,
                        }}
                        className={cn(
                          order.status === NEW &&
                            'rounded-2xl ring-2 ring-primary/40',
                        )}
                      >
                        <DraggableCard
                          order={order}
                          place={placeOf(order)}
                          minutes={minutesSince(order.createdAt)}
                          moveTarget={moveTargetOf(order)}
                          onMove={(item, target) =>
                            move.mutate({ order: item, target })
                          }
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {inColumn.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      {t('kitchen.empty')}
                    </p>
                  )}
                </KitchenColumn>
              );
            })}
          </div>
        </LayoutGroup>
        <DragOverlay dropAnimation={null}>
          {dragged && (
            <OrderCard
              order={dragged}
              place={placeOf(dragged)}
              minutes={minutesSince(dragged.createdAt)}
              moveTarget={null}
              className="rotate-2 cursor-grabbing shadow-2xl"
            />
          )}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
}
