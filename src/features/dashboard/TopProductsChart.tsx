import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { TopProductDto } from '@/shared/api/generated/model';

/**
 * Ranked columns on one baseline. There are few of them, so each carries its value
 * and no axis is needed. Everything is plain text in a list, so it reads without colour.
 */
export function TopProductsChart({ products }: { products: TopProductDto[] }) {
  const { t } = useTranslation();
  const most = Math.max(1, ...products.map((product) => product.quantity));

  return (
    <ol className="grid h-64 auto-cols-fr grid-flow-col">
      {products.map((product) => (
        <li
          key={`${product.productId}-${product.name}`}
          tabIndex={0}
          aria-label={`${product.name}: ${t('dashboard.sold', { quantity: product.quantity })}`}
          className="group relative flex min-w-0 flex-col rounded-lg outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1.5 font-heading text-lg font-bold tabular-nums">
              {product.quantity}
            </span>
            <motion.div
              data-testid="column"
              className="w-6 rounded-t origin-bottom bg-primary"
              style={{ height: `${(product.quantity / most) * 75}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <span className="flex h-12 items-start justify-center border-t px-0.5 pt-2 text-center text-xs font-medium sm:text-sm">
            <span className="line-clamp-2 break-words">{product.name}</span>
          </span>
          {/* The name can be cut short above, so hover and focus always give it whole. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max max-w-48 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-center text-xs text-background shadow-lg group-hover:block group-focus-visible:block"
          >
            <span className="block font-bold">
              {t('dashboard.sold', { quantity: product.quantity })}
            </span>
            {product.name}
          </span>
        </li>
      ))}
    </ol>
  );
}
