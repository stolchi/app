import { useCafesControllerCurrent } from '@/shared/api/generated/cafes/cafes';
import type { CafeFeatures } from './nav';

/** Until the cafe has loaded, nothing optional is shown. */
export function useCafeFeatures(): CafeFeatures {
  const cafe = useCafesControllerCurrent().data;
  return { delivery: cafe?.orderTypes.includes('DELIVERY') ?? false };
}
