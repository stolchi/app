import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAuthControllerRegister } from '@/shared/api/generated/auth/auth';
import { useSessionStore } from '@/shared/auth/session-store';
import { apiErrorKey } from './api-error-key';
import { AuthLayout } from './AuthLayout';
import { FormField } from '@/shared/ui/FormField';
import { registerSchema } from './schemas';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useSessionStore((state) => state.signIn);
  const registerCafe = useAuthControllerRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof registerSchema>,
    unknown,
    z.output<typeof registerSchema>
  >({
    resolver: zodResolver(registerSchema),
    defaultValues: { cafeName: '', ownerName: '', phone: '+998', password: '' },
  });

  const onSubmit = handleSubmit((data) =>
    registerCafe.mutate(
      { data },
      {
        onSuccess: ({ accessToken, user }) => {
          signIn(accessToken, user);
          void navigate('/', { replace: true });
        },
      },
    ),
  );

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.hasAccount')}{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t('auth.register.toLogin')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField
          id="cafeName"
          label={t('auth.fields.cafeName')}
          placeholder={t('auth.fields.cafeNamePlaceholder')}
          autoComplete="organization"
          error={errors.cafeName?.message}
          {...register('cafeName')}
        />
        <FormField
          id="ownerName"
          label={t('auth.fields.ownerName')}
          placeholder={t('auth.fields.ownerNamePlaceholder')}
          autoComplete="name"
          error={errors.ownerName?.message}
          {...register('ownerName')}
        />
        <FormField
          id="phone"
          label={t('auth.fields.phone')}
          type="tel"
          inputMode="tel"
          autoComplete="username"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <FormField
          id="password"
          label={t('auth.fields.password')}
          hint={t('auth.fields.passwordHint')}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {registerCafe.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t(apiErrorKey(registerCafe.error))}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-base"
          disabled={registerCafe.isPending}
        >
          {t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
