import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAuthControllerLogin } from '@/shared/api/generated/auth/auth';
import { useSessionStore } from '@/shared/auth/session-store';
import { apiErrorKey } from './api-error-key';
import { AuthLayout } from './AuthLayout';
import { FormField } from '@/shared/ui/FormField';
import { loginSchema } from './schemas';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useSessionStore((state) => state.signIn);
  const login = useAuthControllerLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof loginSchema>,
    unknown,
    z.output<typeof loginSchema>
  >({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '+998', password: '' },
  });

  const onSubmit = handleSubmit((data) =>
    login.mutate(
      { data },
      {
        onSuccess: ({ accessToken, user }) => {
          signIn(accessToken, user);
          const from = (location.state as { from?: string } | null)?.from;
          void navigate(from ?? '/', { replace: true });
        },
      },
    ),
  );

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/register"
            className="font-medium text-primary hover:underline"
          >
            {t('auth.login.toRegister')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
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
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {login.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t(apiErrorKey(login.error))}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-base"
          disabled={login.isPending}
        >
          {t('auth.login.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
