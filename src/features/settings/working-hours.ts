import type { WorkingHoursDto } from '@/shared/api/generated/model';

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];

export interface DayForm {
  isOpen: boolean;
  open: string;
  close: string;
}
export type HoursForm = Record<Day, DayForm>;

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';

export function toHoursForm(hours: WorkingHoursDto | null): HoursForm {
  return Object.fromEntries(
    DAYS.map((day) => {
      const saved = hours?.[day];
      return [
        day,
        {
          isOpen: Boolean(saved),
          open: saved?.open ?? DEFAULT_OPEN,
          close: saved?.close ?? DEFAULT_CLOSE,
        },
      ];
    }),
  ) as HoursForm;
}

/** No open days at all means the hours were never set, not that the cafe is shut. */
export function toHoursDto(form: HoursForm): WorkingHoursDto | null {
  const open = DAYS.filter((day) => form[day].isOpen);
  if (open.length === 0) return null;
  return Object.fromEntries(
    open.map((day) => [day, { open: form[day].open, close: form[day].close }]),
  );
}
