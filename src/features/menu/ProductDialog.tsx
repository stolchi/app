import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ImageUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CategoryDto, ProductDto } from '@/shared/api/generated/model';
import {
  productsControllerCreate,
  productsControllerSetImage,
  productsControllerUpdate,
} from '@/shared/api/generated/products/products';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { assetUrl, IMAGE_ACCEPT, imageProblem } from '@/shared/lib/assets';
import { formatAmountInput } from '@/shared/lib/format';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { Segmented } from '@/shared/ui/Segmented';
import { Select } from '@/shared/ui/Select';

const MAX_MONEY = 2_000_000_000;

const MAX_VARIANTS = 20;

const amount = z
  .string()
  .transform((value) => value.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d+$/, 'menu.errors.priceInvalid'))
  .transform(Number)
  .pipe(z.number().max(MAX_MONEY, 'menu.errors.priceInvalid'));

const schema = z
  .object({
    name: z.string().trim().min(1, 'menu.errors.nameRequired').max(160),
    categoryId: z.string().min(1, 'menu.errors.categoryRequired'),
    unit: z.enum(['PIECE', 'KG']),
    // Not asked for when there are sizes: then the cheapest size is the price.
    price: z.string(),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().trim().min(1, 'menu.errors.variantName').max(60),
          price: amount,
        }),
      )
      .max(MAX_VARIANTS),
    sendsToKitchen: z.boolean(),
    description: z.string().trim().max(2000),
  })
  .transform(({ price, variants, unit, ...rest }, context) => {
    const sized = unit === 'PIECE' ? variants : [];
    if (sized.length > 0) {
      return { ...rest, unit, variants: sized, price: 0 };
    }
    const parsed = amount.safeParse(price);
    if (!parsed.success) {
      context.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'menu.errors.priceInvalid',
      });
      return z.NEVER;
    }
    return { ...rest, unit, variants: sized, price: parsed.data };
  });

/** The photo that is chosen but not yet uploaded, as a preview. */
function useFilePreview(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

function ProductForm({
  product,
  categories,
  categoryId,
  sortOrder,
  onDone,
}: {
  product: ProductDto | null;
  categories: readonly CategoryDto[];
  categoryId: string;
  sortOrder: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Set once created, so that retrying after a failed upload cannot create it twice.
  const [savedId, setSavedId] = useState(product?.id ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const preview = useFilePreview(file);
  const shownImage =
    preview ?? (product?.imageUrl ? assetUrl(product.imageUrl) : null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? '',
      categoryId: product?.categoryId ?? categoryId,
      unit: product?.unit ?? 'PIECE',
      price: product ? formatAmountInput(product.price) : '',
      variants: (product?.variants ?? []).map((variant) => ({
        ...variant,
        price: formatAmountInput(variant.price),
      })),
      sendsToKitchen: product?.sendsToKitchen ?? true,
      description: product?.description ?? '',
    },
  });
  const variants = useFieldArray({ control, name: 'variants' });
  const unit = useWatch({ control, name: 'unit' });
  const sized = unit === 'PIECE' && variants.fields.length > 0;

  const onSubmit = handleSubmit(async ({ description, ...values }) => {
    setSaving(true);
    setError(null);
    try {
      const data = { ...values, description: description || null };
      let id = savedId;
      if (id) {
        await productsControllerUpdate(id, data);
      } else {
        id = (await productsControllerCreate({ ...data, sortOrder })).id;
        setSavedId(id);
      }
      if (file) await productsControllerSetImage(id, { file });
      onDone();
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
      void invalidate(queryClient, ApiPath.products);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        id="product-name"
        label={t('menu.fields.productName')}
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="space-y-2">
        <Label htmlFor="product-unit">{t('menu.fields.unit')}</Label>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <Segmented
              id="product-unit"
              className="w-max"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'PIECE', label: t('menu.unit.PIECE') },
                { value: 'KG', label: t('menu.unit.KG') },
              ]}
            />
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {!sized && (
          <FormField
            id="product-price"
            label={t(
              unit === 'KG' ? 'menu.fields.pricePerKg' : 'menu.fields.price',
            )}
            inputMode="numeric"
            error={errors.price?.message}
            {...register('price')}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="product-category">{t('menu.fields.category')}</Label>
          <Select
            id="product-category"
            aria-invalid={errors.categoryId ? true : undefined}
            {...register('categoryId')}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {errors.categoryId?.message && (
            <p className="text-sm text-destructive">
              {t(errors.categoryId.message)}
            </p>
          )}
        </div>
      </div>
      {unit === 'PIECE' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t('menu.fields.variants')}
          </legend>
          <p className="text-xs text-muted-foreground">
            {t('menu.variantsHint')}
          </p>
          {variants.fields.map((field, index) => {
            const problem =
              errors.variants?.[index]?.name?.message ??
              errors.variants?.[index]?.price?.message;
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex gap-2">
                  <Input
                    aria-label={t('menu.variantName', { number: index + 1 })}
                    placeholder={t('menu.variantNamePlaceholder')}
                    className="h-11 min-w-0 flex-1 text-base"
                    aria-invalid={
                      errors.variants?.[index]?.name ? true : undefined
                    }
                    {...register(`variants.${index}.name`)}
                  />
                  <Input
                    aria-label={t('menu.variantPrice', { number: index + 1 })}
                    placeholder={t('menu.fields.price')}
                    inputMode="numeric"
                    className="h-11 w-36 text-base"
                    aria-invalid={
                      errors.variants?.[index]?.price ? true : undefined
                    }
                    {...register(`variants.${index}.price`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="size-11"
                    aria-label={t('menu.removeVariant', { number: index + 1 })}
                    onClick={() => variants.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {problem && (
                  <p className="text-sm text-destructive">{t(problem)}</p>
                )}
              </div>
            );
          })}
          {variants.fields.length < MAX_VARIANTS && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => variants.append({ name: '', price: '' })}
            >
              <Plus />
              {t('menu.addVariant')}
            </Button>
          )}
        </fieldset>
      )}
      <Controller
        control={control}
        name="sendsToKitchen"
        render={({ field }) => (
          <div className="space-y-1">
            <Label className="flex min-h-11 items-center gap-3">
              <Checkbox
                className="size-6"
                checked={field.value}
                onCheckedChange={(on) => field.onChange(on === true)}
              />
              {t('menu.fields.sendsToKitchen')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('menu.sendsToKitchenHint')}
            </p>
          </div>
        )}
      />
      <div className="space-y-2">
        <Label htmlFor="product-description">
          {t('menu.fields.description')}
        </Label>
        <Textarea
          id="product-description"
          rows={2}
          className="text-base"
          {...register('description')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product-image">{t('menu.fields.image')}</Label>
        <div className="flex items-center gap-3">
          {shownImage ? (
            <img
              src={shownImage}
              alt=""
              className="size-20 rounded-lg border object-cover"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <ImageUp />
            </span>
          )}
          <input
            id="product-image"
            type="file"
            accept={IMAGE_ACCEPT}
            className="min-w-0 flex-1 text-sm file:mr-3 file:h-11 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:font-medium"
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              const problem = chosen && imageProblem(chosen);
              setFileProblem(problem);
              setFile(problem ? null : chosen);
            }}
          />
        </div>
        <p
          className={
            fileProblem
              ? 'text-sm text-destructive'
              : 'text-sm text-muted-foreground'
          }
        >
          {t(fileProblem ?? 'menu.imageHint')}
        </p>
      </div>
      <ErrorText error={error} />
      <Button type="submit" className="h-11 w-full text-base" disabled={saving}>
        {t('common.save')}
      </Button>
    </form>
  );
}

export function ProductDialog({
  open,
  product,
  categories,
  categoryId,
  sortOrder,
  onClose,
}: {
  open: boolean;
  product: ProductDto | null;
  categories: readonly CategoryDto[];
  categoryId: string;
  sortOrder: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(product ? 'menu.editProduct' : 'menu.addProduct')}
          </DialogTitle>
        </DialogHeader>
        <ProductForm
          product={product}
          categories={categories}
          categoryId={categoryId}
          sortOrder={sortOrder}
          onDone={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
