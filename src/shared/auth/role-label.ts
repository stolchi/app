import type { TFunction } from 'i18next';
import type { UserRoleDto } from '@/shared/api/generated/model';

/** Default roles are named through i18n, custom ones by the cafe itself. */
export function roleLabel(
  t: TFunction,
  role: Pick<UserRoleDto, 'name' | 'systemKey'> | null,
): string {
  if (!role) return t('roles.SUPER_ADMIN');
  return role.systemKey ? t(`roles.${role.systemKey}`) : role.name;
}
