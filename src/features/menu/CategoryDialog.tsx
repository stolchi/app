import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useCategoriesControllerCreate,
  useCategoriesControllerUpdate,
} from '@/shared/api/generated/categories/categories';
import type { CategoryDto } from '@/shared/api/generated/model';
import { useQueryClient } from '@tanstack/react-query';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';

const schema = z.object({
  name: z.string().trim().min(1, 'menu.errors.nameRequired').max(120),
  isActive: z.boolean(),
});

function CategoryForm({
  category,
  sortOrder,
  onDone,
}: {
  category: CategoryDto | null;
  sortOrder: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutation = {
    mutation: {
      onSuccess: () => {
        void invalidate(queryClient, ApiPath.categories);
        onDone();
      },
    },
  };
  const create = useCategoriesControllerCreate(mutation);
  const update = useCategoriesControllerUpdate(mutation);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      isActive: category?.isActive ?? true,
    },
  });

  const onSubmit = handleSubmit((data) => {
    if (category) update.mutate({ id: category.id, data });
    else create.mutate({ data: { ...data, sortOrder } });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        id="category-name"
        label={t('menu.fields.categoryName')}
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="category-active">{t('menu.fields.isActive')}</Label>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch
              id="category-active"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
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

export function CategoryDialog({
  open,
  category,
  sortOrder,
  onClose,
}: {
  open: boolean;
  category: CategoryDto | null;
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(category ? 'menu.editCategory' : 'menu.addCategory')}
          </DialogTitle>
        </DialogHeader>
        <CategoryForm
          category={category}
          sortOrder={sortOrder}
          onDone={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
