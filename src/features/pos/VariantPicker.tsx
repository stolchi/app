import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProductDto } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/format';

/** A product with sizes asks which one before it goes into the cart. */
export function VariantPicker({
  product,
  onClose,
  onPick,
}: {
  product: ProductDto | null;
  onClose: () => void;
  onPick: (variantId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={product !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('pos.chooseSize', { name: product?.name })}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {product?.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => {
                onPick(variant.id);
                onClose();
              }}
              className="flex min-h-16 flex-col items-start justify-center rounded-2xl border bg-card px-4 py-2 text-left shadow-xs outline-none hover:border-primary hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]"
            >
              <span className="font-semibold">{variant.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatMoney(variant.price)}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
