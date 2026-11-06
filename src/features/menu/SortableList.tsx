import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex animate-in items-center gap-1 bg-card pr-1 duration-300 fade-in slide-in-from-bottom-1',
        isDragging && 'relative z-10 shadow-md',
        className,
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={t('menu.dragToReorder')}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      {children}
    </li>
  );
}

/** A list reordered by its drag handles, with the mouse, touch or the keyboard. */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  rowClassName,
}: {
  items: readonly T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T) => ReactNode;
  rowClassName?: (item: T) => string | undefined;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex(({ id }) => id === active.id);
    const to = items.findIndex(({ id }) => id === over.id);
    onReorder(arrayMove([...items], from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map(({ id }) => id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              className={rowClassName?.(item)}
            >
              {renderItem(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
