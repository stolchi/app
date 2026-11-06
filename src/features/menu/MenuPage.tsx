import { useQueryClient } from '@tanstack/react-query';
import { ListPlus, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  categoriesControllerUpdate,
  getCategoriesControllerListQueryKey,
  useCategoriesControllerList,
  useCategoriesControllerRemove,
} from '@/shared/api/generated/categories/categories';
import type { CategoryDto, ProductDto } from '@/shared/api/generated/model';
import {
  getProductsControllerListQueryKey,
  productsControllerUpdate,
  useProductsControllerList,
  useProductsControllerRemove,
  useProductsControllerSetAvailability,
} from '@/shared/api/generated/products/products';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { formatMoney } from '@/shared/lib/format';
import { useHeldValue } from '@/shared/lib/use-held-value';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FoodThumb } from '@/shared/ui/FoodThumb';
import { ErrorText } from '@/shared/ui/ErrorText';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { CategoryDialog } from './CategoryDialog';
import { ProductDialog } from './ProductDialog';
import { changedPositions, nextSortOrder } from './reorder';
import { SortableList } from './SortableList';

type Editing<T> = { item: T | null } | null;

export function MenuPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const categories = useCategoriesControllerList();
  const products = useProductsControllerList();

  const [chosenCategoryId, setChosenCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<Editing<CategoryDto>>(null);
  const [editingProduct, setEditingProduct] =
    useState<Editing<ProductDto>>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryDto | null>(
    null,
  );
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(
    null,
  );
  const [reorderError, setReorderError] = useState<unknown>(null);

  const shownCategory = useHeldValue(editingCategory);
  const shownProduct = useHeldValue(editingProduct);

  const removeCategory = useCategoriesControllerRemove({
    mutation: {
      onSuccess: () => {
        setDeletingCategory(null);
        void invalidate(queryClient, ApiPath.categories);
      },
    },
  });
  const removeProduct = useProductsControllerRemove({
    mutation: {
      onSuccess: () => {
        setDeletingProduct(null);
        void invalidate(queryClient, ApiPath.products);
      },
    },
  });
  const setAvailability = useProductsControllerSetAvailability({
    mutation: {
      onSettled: () => invalidate(queryClient, ApiPath.products),
    },
  });

  if (!categories.data || !products.data) {
    return (
      <QueryState
        isPending={categories.isPending || products.isPending}
        error={categories.error ?? products.error}
        refetch={() => {
          void categories.refetch();
          void products.refetch();
        }}
      />
    );
  }

  const allCategories = categories.data;
  const allProducts = products.data;
  const selected =
    allCategories.find(({ id }) => id === chosenCategoryId) ?? allCategories[0];
  const shownProducts = allProducts.filter(
    (product) => product.categoryId === selected?.id,
  );

  /** Shows the new order at once, then saves the positions that changed. */
  const reorder = async <T extends { id: string; sortOrder: number }>(
    items: T[],
    apply: (id: string, sortOrder: number) => Promise<unknown>,
    showOptimistically: (positions: Map<string, number>) => void,
    path: string,
  ) => {
    const changes = changedPositions(items);
    showOptimistically(new Map(items.map(({ id }, index) => [id, index])));
    setReorderError(null);
    try {
      await Promise.all(
        changes.map(({ id, sortOrder }) => apply(id, sortOrder)),
      );
    } catch (error) {
      setReorderError(error);
    } finally {
      // After a failure this brings back what was actually saved.
      void invalidate(queryClient, path);
    }
  };

  const reorderCategories = (items: CategoryDto[]) =>
    reorder(
      items,
      (id, sortOrder) => categoriesControllerUpdate(id, { sortOrder }),
      (positions) =>
        queryClient.setQueryData<CategoryDto[]>(
          getCategoriesControllerListQueryKey(),
          (current) =>
            current &&
            [...current]
              .map((row) => ({
                ...row,
                sortOrder: positions.get(row.id) ?? row.sortOrder,
              }))
              .sort((a, b) => a.sortOrder - b.sortOrder),
        ),
      ApiPath.categories,
    );

  const reorderProducts = (items: ProductDto[]) =>
    reorder(
      items,
      (id, sortOrder) => productsControllerUpdate(id, { sortOrder }),
      (positions) =>
        queryClient.setQueryData<ProductDto[]>(
          getProductsControllerListQueryKey(),
          (current) =>
            current &&
            [...current]
              .map((row) => ({
                ...row,
                sortOrder: positions.get(row.id) ?? row.sortOrder,
              }))
              .sort((a, b) => a.sortOrder - b.sortOrder),
        ),
      ApiPath.products,
    );

  return (
    <Page title={t('nav.menu')}>
      <ErrorText error={reorderError} />
      <ErrorText error={setAvailability.error} />
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t('menu.categories')}</h2>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setEditingCategory({ item: null })}
            >
              <Plus />
              {t('menu.addCategory')}
            </Button>
          </div>
          {allCategories.length === 0 ? (
            <EmptyState icon={ListPlus}>{t('menu.noCategories')}</EmptyState>
          ) : (
            <SortableList
              items={allCategories}
              onReorder={(items) => void reorderCategories(items)}
              rowClassName={(category) =>
                cn(category.id === selected?.id && 'bg-primary/10!')
              }
              renderItem={(category) => (
                <>
                  <button
                    type="button"
                    aria-current={category.id === selected?.id}
                    onClick={() => setChosenCategoryId(category.id)}
                    className="min-w-0 flex-1 py-3 text-left outline-none focus-visible:underline"
                  >
                    <span
                      className={cn(
                        'block truncate font-medium',
                        !category.isActive &&
                          'text-muted-foreground line-through',
                      )}
                    >
                      {category.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('menu.productCount', {
                        value: allProducts.filter(
                          (p) => p.categoryId === category.id,
                        ).length,
                      })}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('menu.editNamed', { name: category.name })}
                    onClick={() => setEditingCategory({ item: category })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    className="size-11 text-destructive"
                    aria-label={t('menu.deleteNamed', { name: category.name })}
                    onClick={() => {
                      removeCategory.reset();
                      setDeletingCategory(category);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            />
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate font-semibold">
              {selected?.name ?? t('menu.products')}
            </h2>
            <Button
              className="h-11"
              disabled={!selected}
              onClick={() => setEditingProduct({ item: null })}
            >
              <Plus />
              {t('menu.addProduct')}
            </Button>
          </div>
          {shownProducts.length === 0 ? (
            <EmptyState icon={UtensilsCrossed}>
              {t(selected ? 'menu.noProducts' : 'menu.addCategoryFirst')}
            </EmptyState>
          ) : (
            <SortableList
              items={shownProducts}
              onReorder={(items) => void reorderProducts(items)}
              renderItem={(product) => (
                <>
                  <FoodThumb
                    name={product.name}
                    imageUrl={product.imageUrl}
                    className="my-2 size-14 shrink-0 rounded-xl text-xl"
                  />
                  <div className="min-w-0 flex-1 px-2">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(product.price)}
                    </p>
                  </div>
                  <label className="flex shrink-0 flex-col items-center gap-1 px-1 text-xs text-muted-foreground">
                    <Switch
                      checked={product.isAvailable}
                      aria-label={t('menu.availableNamed', {
                        name: product.name,
                      })}
                      disabled={setAvailability.isPending}
                      onCheckedChange={(isAvailable) =>
                        setAvailability.mutate({
                          id: product.id,
                          data: { isAvailable },
                        })
                      }
                    />
                    {t(product.isAvailable ? 'menu.available' : 'menu.soldOut')}
                  </label>
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('menu.editNamed', { name: product.name })}
                    onClick={() => setEditingProduct({ item: product })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    className="size-11 text-destructive"
                    aria-label={t('menu.deleteNamed', { name: product.name })}
                    onClick={() => {
                      removeProduct.reset();
                      setDeletingProduct(product);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            />
          )}
        </section>
      </div>

      <CategoryDialog
        open={editingCategory !== null}
        category={shownCategory?.item ?? null}
        sortOrder={nextSortOrder(allCategories)}
        onClose={() => setEditingCategory(null)}
      />
      <ProductDialog
        open={editingProduct !== null}
        product={shownProduct?.item ?? null}
        categories={allCategories}
        categoryId={selected?.id ?? ''}
        sortOrder={nextSortOrder(shownProducts)}
        onClose={() => setEditingProduct(null)}
      />
      <ConfirmDialog
        open={deletingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
        title={t('menu.deleteNamedQuestion', { name: deletingCategory?.name })}
        confirmLabel={t('common.delete')}
        pending={removeCategory.isPending}
        error={removeCategory.error}
        onConfirm={() =>
          deletingCategory && removeCategory.mutate({ id: deletingCategory.id })
        }
      />
      <ConfirmDialog
        open={deletingProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingProduct(null);
        }}
        title={t('menu.deleteNamedQuestion', { name: deletingProduct?.name })}
        description={t('menu.deleteProductNote')}
        confirmLabel={t('common.delete')}
        pending={removeProduct.isPending}
        error={removeProduct.error}
        onConfirm={() =>
          deletingProduct && removeProduct.mutate({ id: deletingProduct.id })
        }
      />
    </Page>
  );
}
