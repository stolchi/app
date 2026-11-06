import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  useStaffControllerCreate,
  useStaffControllerCreateRole,
  useStaffControllerList,
  useStaffControllerListRoles,
  useStaffControllerRemoveRole,
  useStaffControllerUpdate,
  useStaffControllerUpdateRole,
} from '@/shared/api/generated/staff/staff';
import type {
  Permission,
  StaffMemberDto,
  StaffRoleDto,
} from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { roleLabel } from '@/shared/auth/role-label';
import { useSessionStore } from '@/shared/auth/session-store';
import { normalizePhone, PHONE_PATTERN } from '@/shared/lib/phone';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { Segmented } from '@/shared/ui/Segmented';
import { Select } from '@/shared/ui/Select';
import { PERMISSION_GROUPS, togglePermission } from './permission-groups';

// Messages are i18n keys. The limits mirror the backend's DTOs.
const memberFields = {
  name: z.string().trim().min(1, 'staff.errors.nameRequired').max(120),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(PHONE_PATTERN, 'auth.errors.phoneInvalid')),
  roleId: z.string().min(1, 'staff.errors.roleRequired'),
};
const password = z
  .string()
  .min(8, 'auth.errors.passwordTooShort')
  .max(128, 'auth.errors.passwordTooLong');
const memberSchema = z.object({
  ...memberFields,
  // Empty on an existing member means "leave it as it is".
  password: z.union([z.literal(''), password]),
});

function MemberForm({
  member,
  roles,
  onDone,
}: {
  member: StaffMemberDto | null;
  roles: StaffRoleDto[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const selfId = useSessionStore((state) => state.user?.id);
  const isSelf = member?.id === selfId;
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const mutation = {
    mutation: {
      onSuccess: () => {
        void invalidate(queryClient, ApiPath.staff);
        onDone();
      },
    },
  };
  const create = useStaffControllerCreate(mutation);
  const update = useStaffControllerUpdate(mutation);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<
    z.input<typeof memberSchema>,
    unknown,
    z.output<typeof memberSchema>
  >({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: member?.name ?? '',
      phone: member?.phone ?? '+998',
      roleId: member?.roleId ?? '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(({ password: newPassword, ...data }) => {
    if (!member) {
      if (!newPassword) {
        setError('password', { message: 'auth.errors.passwordRequired' });
        return;
      }
      create.mutate({ data: { ...data, password: newPassword } });
      return;
    }
    update.mutate({
      id: member.id,
      data: {
        name: data.name,
        phone: data.phone,
        ...(newPassword && { password: newPassword }),
        // Changing your own role or status is refused, so it is not even sent.
        ...(!isSelf && { roleId: data.roleId, isActive }),
      },
    });
  });

  return (
    <form noValidate className="space-y-4" onSubmit={onSubmit}>
      <FormField
        id="member-name"
        label={t('staff.fields.name')}
        error={errors.name?.message}
        {...register('name')}
      />
      <FormField
        id="member-phone"
        type="tel"
        label={t('staff.fields.phone')}
        error={errors.phone?.message}
        {...register('phone')}
      />
      <FormField
        id="member-password"
        type="password"
        autoComplete="new-password"
        label={t(member ? 'staff.fields.newPassword' : 'staff.fields.password')}
        hint={
          member
            ? t('staff.fields.newPasswordHint')
            : t('auth.fields.passwordHint')
        }
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="space-y-2">
        <Label htmlFor="member-role">{t('staff.fields.role')}</Label>
        <Select
          id="member-role"
          className="h-12"
          disabled={isSelf}
          aria-invalid={errors.roleId ? true : undefined}
          {...register('roleId')}
        >
          <option value="" disabled>
            {t('staff.fields.role')}
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {roleLabel(t, role)}
            </option>
          ))}
        </Select>
        {errors.roleId?.message && (
          <p className="text-sm text-destructive">{t(errors.roleId.message)}</p>
        )}
      </div>
      {member && !isSelf && (
        <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
          <span>
            <Label htmlFor="member-active">{t('staff.fields.active')}</Label>
            <span className="mt-1 block text-sm text-muted-foreground">
              {t('staff.fields.activeHint')}
            </span>
          </span>
          <Switch
            id="member-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>
      )}
      <ErrorText error={create.error ?? update.error} />
      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={create.isPending || update.isPending}
      >
        {t('common.save')}
      </Button>
    </form>
  );
}

function MembersTab({ roles }: { roles: StaffRoleDto[] }) {
  const { t } = useTranslation();
  const selfId = useSessionStore((state) => state.user?.id);
  const members = useStaffControllerList();
  // `null` is the empty form for a new member.
  const [editing, setEditing] = useState<StaffMemberDto | null | undefined>();

  return (
    <div className="space-y-3">
      <Button className="h-11 px-4" onClick={() => setEditing(null)}>
        <Plus />
        {t('staff.addMember')}
      </Button>
      {!members.data ? (
        <QueryState
          isPending={members.isPending}
          error={members.error}
          refetch={members.refetch}
        />
      ) : members.data.length === 0 ? (
        <EmptyState icon={Users}>{t('staff.noMembers')}</EmptyState>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {members.data.map((member) => {
            const role = roles.find(({ id }) => id === member.roleId);
            return (
              <li
                key={member.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs',
                  !member.isActive && 'opacity-60',
                )}
              >
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold"
                >
                  {member.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {member.name}
                    {member.id === selfId && (
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                        ({t('staff.you')})
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {member.phone}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs font-medium">
                    {role && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                        {roleLabel(t, role)}
                      </span>
                    )}
                    {!member.isActive && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                        {t('staff.inactive')}
                      </span>
                    )}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  className="size-11"
                  aria-label={t('staff.editMemberNamed', { name: member.name })}
                  onClick={() => setEditing(member)}
                >
                  <Pencil />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t(editing ? 'staff.editMember' : 'staff.addMember')}
            </DialogTitle>
          </DialogHeader>
          {editing !== undefined && (
            <MemberForm
              member={editing}
              roles={roles}
              onDone={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleForm({
  role,
  onDone,
}: {
  role: StaffRoleDto | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState(role?.name ?? '');
  const [nameError, setNameError] = useState<string>();
  const [permissions, setPermissions] = useState<readonly Permission[]>(
    role?.permissions ?? [],
  );
  const mutation = {
    mutation: {
      onSuccess: () => {
        void invalidate(queryClient, ApiPath.staff);
        onDone();
      },
    },
  };
  const create = useStaffControllerCreateRole(mutation);
  const update = useStaffControllerUpdateRole(mutation);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!role?.systemKey && !name.trim()) {
          setNameError('staff.errors.roleNameRequired');
          return;
        }
        const list = [...permissions];
        if (role) {
          update.mutate({
            id: role.id,
            data: {
              permissions: list,
              ...(!role.systemKey && { name: name.trim() }),
            },
          });
        } else {
          create.mutate({ data: { name: name.trim(), permissions: list } });
        }
      }}
    >
      {!role?.systemKey && (
        <FormField
          id="role-name"
          label={t('staff.fields.roleName')}
          maxLength={60}
          value={name}
          error={nameError}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
        />
      )}
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.id} className="space-y-1">
          <legend className="mb-1 font-semibold">
            {t(`staff.groups.${group.id}`)}
          </legend>
          {group.permissions.map((permission) => (
            <label
              key={permission}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={permissions.includes(permission)}
                onCheckedChange={() =>
                  setPermissions(togglePermission(permissions, permission))
                }
              />
              {t(`permissions.${permission}`)}
            </label>
          ))}
        </fieldset>
      ))}
      <ErrorText error={create.error ?? update.error} />
      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={create.isPending || update.isPending}
      >
        {t('common.save')}
      </Button>
    </form>
  );
}

function RolesTab({ roles }: { roles: StaffRoleDto[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // `null` is the empty form for a new role.
  const [editing, setEditing] = useState<StaffRoleDto | null | undefined>();
  const [removing, setRemoving] = useState<StaffRoleDto | null>(null);
  const remove = useStaffControllerRemoveRole({
    mutation: {
      onSuccess: () => {
        void invalidate(queryClient, ApiPath.staff);
        setRemoving(null);
      },
    },
  });

  return (
    <div className="space-y-3">
      <Button className="h-11 px-4" onClick={() => setEditing(null)}>
        <Plus />
        {t('staff.addRole')}
      </Button>
      <ul className="grid gap-2 md:grid-cols-2">
        {roles.map((role) => {
          const label = roleLabel(t, role);
          const locked = role.systemKey === 'OWNER';
          return (
            <li
              key={role.id}
              className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">
                  {locked
                    ? t('staff.roleLocked')
                    : [
                        t('staff.memberCount', { count: role.staffCount }),
                        t('staff.permissionCount', {
                          count: role.permissions.length,
                        }),
                      ].join(' · ')}
                </span>
              </span>
              {!locked && (
                <Button
                  variant="ghost"
                  className="size-11"
                  aria-label={t('staff.editRoleNamed', { name: label })}
                  onClick={() => setEditing(role)}
                >
                  <Pencil />
                </Button>
              )}
              {!role.systemKey && (
                <Button
                  variant="ghost"
                  className="size-11 text-destructive"
                  aria-label={t('staff.deleteRole', { name: label })}
                  onClick={() => {
                    remove.reset();
                    setRemoving(role);
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('staff.editRole', { name: roleLabel(t, editing) })
                : t('staff.newRole')}
            </DialogTitle>
          </DialogHeader>
          {editing !== undefined && (
            <RoleForm role={editing} onDone={() => setEditing(undefined)} />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={t('staff.deleteRoleQuestion', { name: removing?.name })}
        confirmLabel={t('common.delete')}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (removing) remove.mutate({ id: removing.id });
        }}
      />
    </div>
  );
}

export function StaffPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const roles = useStaffControllerListRoles();

  return (
    <Page title={t('nav.staff')}>
      <Segmented
        id="staff-tab"
        className="w-max"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'members', label: t('staff.tabs.members') },
          { value: 'roles', label: t('staff.tabs.roles') },
        ]}
      />
      {!roles.data ? (
        <QueryState
          isPending={roles.isPending}
          error={roles.error}
          refetch={roles.refetch}
        />
      ) : tab === 'members' ? (
        <MembersTab roles={roles.data} />
      ) : (
        <RolesTab roles={roles.data} />
      )}
    </Page>
  );
}
