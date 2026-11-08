import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Scale, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCategoriesControllerList } from '@/shared/api/generated/categories/categories';
import { useOrdersControllerUpdateItems } from '@/shared/api/generated/orders/orders';
import { useProductsControllerList } from '@/shared/api/generated/products/products';
import type { OrderDto, ProductDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { VariantPicker } from '@/features/pos/VariantPicker';
import { formatMoney } from '@/shared/lib/format';
import { productPrice } from '@/shared/lib/product-price';
import { formatWeight, lineTotal } from '@/shared/lib/quantity';
import { amountsOf } from '@/shared/lib/order-charges';
import { celebrate } from '@/shared/ui/Celebration';
import { ErrorText } from '@/shared/ui/ErrorText';
import {
  addProduct,
  addsFood,
  linesOf,
  needsWeighing,
  setQuantity,
  setWeight,
  toPayload,
  totalOf,
  type EditLine,
} from './edit-lines';
import { OrderAmounts } from './OrderAmounts';
import { isStarted } from './order-rules';
import { WeightDialog } from './WeightDialog';

function ProductPicker({ onPick }: { onPick: (product: ProductDto) => void }) {
  const { t } = useTranslation();
  const categories = useCategoriesControllerList();
  const products = useProductsControllerList();
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const active = new Set(
      (categories.data ?? [])
        .filter((category) => category.isActive)
        .map(({ id }) => id),
    );
    const wanted = query.trim().toLowerCase();
    return (products.data ?? []).filter(
      (product) =>
        product.isAvailable &&
        active.has(product.categoryId) &&
        product.name.toLowerCase().includes(wanted),
    );
  }, [categories.data, products.data, query]);

  return (
    <div className="space-y-2">
      <p className="font-semibold">{t('orders.edit.addProduct')}</p>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t('orders.edit.search')}
          placeholder={t('orders.edit.search')}
          className="h-11 rounded-xl pl-9 text-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ul className="max-h-48 divide-y overflow-y-auto rounded-xl border">
        {shown.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              onClick={() => onPick(product)}
              className="flex min-h-11 w-full items-center justify-between gap-3 p-2.5 text-left text-sm hover:bg-muted"
            >
              <span className="font-medium">{product.name}</span>
              <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                {productPrice(product)}
                <Plus className="size-4 text-primary" />
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="p-3 text-center text-sm text-muted-foreground">
            {t('orders.edit.noResults')}
          </li>
        )}
      </ul>
    </div>
  );
}

function EditForm({ order, onDone }: { order: OrderDto; onDone: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<EditLine[]>(() => linesOf(order));
  const [sizing, setSizing] = useState<ProductDto | null>(null);
  /** A product being added by weight, or a line being weighed. */
  const [weighing, setWeighing] = useState<
    { product: ProductDto } | { line: EditLine } | null
  >(null);
  const pick = (product: ProductDto) => {
    if (product.variants.length > 0) setSizing(product);
    else if (product.unit === 'KG') setWeighing({ product });
    else setLines(addProduct(lines, product));
  };
  const save = useOrdersControllerUpdateItems({
    mutation: {
      // On failure too: a conflict means this screen is behind someone else's change.
      onSettled: () =>
        invalidate(queryClient, ApiPath.orders, ApiPath.dashboard),
    },
  });

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-xl border">
        {lines.map((line) => (
          <li key={line.key} className="space-y-2 p-2.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold">
                {line.name}
                {!line.weighed && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    {t('weight.notWeighed')}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap">
                {formatMoney(lineTotal(line))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {line.unit === 'KG' ? (
                <div className="flex items-center rounded-xl bg-muted">
                  <Button
                    variant="ghost"
                    className="h-11 gap-2 px-3 font-bold"
                    aria-label={t('weight.edit', { name: line.name })}
                    onClick={() => setWeighing({ line })}
                  >
                    <Scale />
                    {formatWeight(line.quantity)}
                  </Button>
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('pos.decrease', { name: line.name })}
                    onClick={() => setLines(setQuantity(lines, line.key, 0))}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center rounded-xl bg-muted">
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('pos.decrease', { name: line.name })}
                    onClick={() =>
                      setLines(setQuantity(lines, line.key, line.quantity - 1))
                    }
                  >
                    <Minus />
                  </Button>
                  <span className="w-7 text-center font-bold">
                    {line.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('pos.increase', { name: line.name })}
                    onClick={() =>
                      setLines(setQuantity(lines, line.key, line.quantity + 1))
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              )}
              <Input
                className="h-11 min-w-0 flex-1 rounded-xl"
                placeholder={t('pos.notePlaceholder')}
                aria-label={t('pos.noteFor', { name: line.name })}
                maxLength={500}
                value={line.note}
                onChange={(event) =>
                  setLines(
                    lines.map((other) =>
                      other.key === line.key
                        ? { ...other, note: event.target.value }
                        : other,
                    ),
                  )
                }
              />
            </div>
          </li>
        ))}
      </ul>
      {lines.length === 0 && (
        <p className="text-sm text-destructive">{t('orders.edit.empty')}</p>
      )}
      <ProductPicker onPick={pick} />
      <VariantPicker
        product={sizing}
        onClose={() => setSizing(null)}
        onPick={(variantId) => {
          if (sizing) setLines(addProduct(lines, sizing, { variantId }));
        }}
      />
      <WeightDialog
        target={
          weighing &&
          ('line' in weighing
            ? {
                name: weighing.line.name,
                pricePerKg: weighing.line.price,
                grams: weighing.line.quantity,
              }
            : {
                name: weighing.product.name,
                pricePerKg: weighing.product.price,
                grams: null,
              })
        }
        onClose={() => setWeighing(null)}
        onDone={(grams) => {
          if (!weighing) return;
          setLines(
            'line' in weighing
              ? setWeight(lines, weighing.line.key, grams)
              : addProduct(lines, weighing.product, { grams }),
          );
        }}
      />
      {/* The order keeps the rates it was placed with. */}
      <OrderAmounts amounts={amountsOf(totalOf(lines), order)} />
      {isStarted(order.status) && addsFood(order, lines) && (
        <p
          role="status"
          className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900"
        >
          {t('orders.edit.backToKitchen')}
        </p>
      )}
      {needsWeighing(lines) && (
        <p className="text-sm text-amber-900">{t('weight.mustWeigh')}</p>
      )}
      <ErrorText error={save.error} />
      <Button
        className="h-12 w-full text-base"
        disabled={lines.length === 0 || save.isPending}
        onClick={() =>
          save.mutate(
            { id: order.id, data: { items: toPayload(lines) } },
            {
              onSuccess: () => {
                celebrate(
                  t('orders.edit.saved', { number: order.displayNumber }),
                );
                onDone();
              },
            },
          )
        }
      >
        {t('common.save')}
      </Button>
    </div>
  );
}

export function OrderEditDialog({
  order,
  open,
  onOpenChange,
}: {
  order: OrderDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('orders.edit.title', { number: order.displayNumber })}
          </DialogTitle>
        </DialogHeader>
        {/* Mounted per opening, so that it starts from the order as it is now. */}
        {open && <EditForm order={order} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
