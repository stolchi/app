import type { ProductDto } from '@/shared/api/generated/model';
import i18n from '@/shared/i18n';
import { formatMoney } from './format';

/** What a product's price says: per kilogram, or from the cheapest size. */
export function productPrice(
  product: Pick<ProductDto, 'price' | 'unit' | 'variants'>,
): string {
  if (product.unit === 'KG') {
    return `${formatMoney(product.price)} / ${i18n.t('menu.perKg')}`;
  }
  return product.variants.length > 0
    ? i18n.t('menu.fromPrice', { price: formatMoney(product.price) })
    : formatMoney(product.price);
}
