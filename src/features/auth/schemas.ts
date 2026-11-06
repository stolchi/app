import { z } from 'zod';
import { normalizePhone, PHONE_PATTERN } from '@/shared/lib/phone';

// Messages are i18n keys. The limits mirror the backend's DTOs.
const phone = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(PHONE_PATTERN, 'auth.errors.phoneInvalid'));

export const loginSchema = z.object({
  phone,
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

export const registerSchema = z.object({
  cafeName: z.string().trim().min(1, 'auth.errors.cafeNameRequired').max(120),
  ownerName: z.string().trim().min(1, 'auth.errors.ownerNameRequired').max(120),
  phone,
  password: z
    .string()
    .min(8, 'auth.errors.passwordTooShort')
    .max(128, 'auth.errors.passwordTooLong'),
});
