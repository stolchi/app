/**
 * Phone fields start with +998, which pasting can repeat and tabbing in can overwrite,
 * so all of 90 123 45 67, 998901234567 and +998+998901234567 mean the same number.
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = /^(?:998)+(\d{9})$/.exec(digits)?.[1];
  if (local) return `+998${local}`;
  return digits.length === 9 ? `+998${digits}` : value;
}

export const PHONE_PATTERN = /^\+998\d{9}$/;
