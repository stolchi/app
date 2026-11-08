import type { ProductUnit } from '@/shared/api/generated/model';

/** The most a weighed line can be, in grams. Mirrors the API. */
export const MAX_GRAMS = 100_000;

interface PricedLine {
  price: number;
  /** Pieces, or grams for KG. */
  quantity: number;
  unit: ProductUnit;
}

/** Whole so'm: a weighed line is priced per kilogram. Mirrors the API. */
export const lineTotal = ({ price, quantity, unit }: PricedLine) =>
  unit === 'KG' ? Math.round((price * quantity) / 1000) : price * quantity;

/** `1250` → `1,25 kg`, `350` → `350 g`. */
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  const kilos = (grams / 1000).toFixed(3).replace(/\.?0+$/, '');
  return `${kilos.replace('.', ',')} kg`;
}

/** What goes before a line's name: `2 ×` or `1,25 kg`. */
export const quantityLabel = (unit: ProductUnit, quantity: number) =>
  unit === 'KG' ? formatWeight(quantity) : `${quantity} ×`;

/** Kilograms as typed (`1,25` or `1.25`) to grams, or null when it is not a weight. */
export function parseKilos(text: string): number | null {
  const normal = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(normal)) return null;
  const grams = Math.round(Number(normal) * 1000);
  return grams >= 1 && grams <= MAX_GRAMS ? grams : null;
}

/** Grams to the text a kilogram field starts with. */
export const kilosInput = (grams: number) =>
  (grams / 1000)
    .toFixed(3)
    .replace(/\.?0+$/, '')
    .replace('.', ',');

/** How many things: pieces count one by one, a weighed line counts once. */
export const itemCount = (
  lines: readonly { unit: ProductUnit; quantity: number }[],
) =>
  lines.reduce(
    (sum, line) => sum + (line.unit === 'KG' ? 1 : line.quantity),
    0,
  );
