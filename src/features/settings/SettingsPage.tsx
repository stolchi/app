import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ImageUp, MonitorPlay, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCafesControllerCurrent,
  useCafesControllerSetLogo,
  useCafesControllerSetTelegramBot,
  useCafesControllerUpdate,
} from '@/shared/api/generated/cafes/cafes';
import type { CafeDto } from '@/shared/api/generated/model';
import { assetUrl, IMAGE_ACCEPT, imageProblem } from '@/shared/lib/assets';
import { readablePrimary } from '@/shared/lib/cafe-theme';
import { normalizePhone, PHONE_PATTERN } from '@/shared/lib/phone';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { OrderSettingsForm } from './OrderSettingsForm';
import { SavedNote, Section, useCafeMutationOptions } from './settings-parts';
import {
  DAYS,
  toHoursDto,
  toHoursForm,
  type Day,
  type HoursForm,
} from './working-hours';

const DEFAULT_COLOR = '#b4532a';
const SWATCHES = [
  '#b4532a',
  '#b7791f',
  '#2f7d4f',
  '#1f7a8c',
  '#6b4ca0',
  '#b03a5b',
];

const schema = z.object({
  name: z.string().trim().min(1, 'settings.errors.nameRequired').max(120),
  // Only the +998 of an untouched field counts as empty.
  phone: z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed === '' || trimmed === '+998'
        ? ''
        : normalizePhone(trimmed);
    })
    .refine((value) => value === '' || PHONE_PATTERN.test(value), {
      error: 'auth.errors.phoneInvalid',
    }),
  address: z.string().trim().max(255),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const TELEGRAM_TOKEN = /^\d{5,20}:[A-Za-z0-9_-]{30,64}$/;

type CafeFormValues = z.input<typeof schema>;

function ColorSample({ control }: { control: Control<CafeFormValues> }) {
  const { t } = useTranslation();
  const color = useWatch({ control, name: 'primaryColor' });
  return (
    <motion.span
      layout
      className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-white shadow-sm transition-colors"
      style={{ backgroundColor: readablePrimary(color) }}
    >
      {t('settings.preview')}
    </motion.span>
  );
}

function CafeForm({ cafe }: { cafe: CafeDto }) {
  const { t } = useTranslation();
  const update = useCafesControllerUpdate(useCafeMutationOptions());
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CafeFormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: cafe.name,
      phone: cafe.phone ?? '+998',
      address: cafe.address ?? '',
      primaryColor: cafe.primaryColor ?? DEFAULT_COLOR,
    },
  });

  const onSubmit = handleSubmit(({ name, phone, address, primaryColor }) =>
    update.mutate({
      data: {
        name,
        phone: phone || null,
        address: address || null,
        primaryColor,
      },
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        id="cafe-name"
        label={t('settings.fields.name')}
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="cafe-phone"
          label={t('settings.fields.phone')}
          type="tel"
          inputMode="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="space-y-2">
          <Label htmlFor="cafe-color">
            {t('settings.fields.primaryColor')}
          </Label>
          <Controller
            control={control}
            name="primaryColor"
            render={({ field }) => (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="cafe-color"
                  type="color"
                  className="size-11 cursor-pointer rounded-xl border border-input bg-card p-1"
                  {...field}
                />
                {SWATCHES.map((swatch) => (
                  <motion.button
                    key={swatch}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    aria-label={swatch}
                    aria-pressed={field.value.toLowerCase() === swatch}
                    onClick={() => field.onChange(swatch)}
                    className="size-9 rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-foreground"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t('settings.colorHint')}
          </p>
          <ColorSample control={control} />
        </div>
      </div>
      <FormField
        id="cafe-address"
        label={t('settings.fields.address')}
        error={errors.address?.message}
        {...register('address')}
      />
      <ErrorText error={update.error} />
      <div className="flex items-center gap-3">
        <Button type="submit" className="h-11 px-6" disabled={update.isPending}>
          {t('common.save')}
        </Button>
        <SavedNote visible={update.isSuccess} />
      </div>
    </form>
  );
}

function LogoForm({ cafe }: { cafe: CafeDto }) {
  const { t } = useTranslation();
  const setLogo = useCafesControllerSetLogo(useCafeMutationOptions());
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {cafe.logoUrl ? (
          <img
            src={assetUrl(cafe.logoUrl)}
            alt={t('settings.logoAlt')}
            className="size-20 rounded-xl border object-cover"
          />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            <ImageUp />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="cafe-logo">{t('settings.chooseLogo')}</Label>
          <input
            id="cafe-logo"
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={setLogo.isPending}
            className="w-full text-sm file:mr-3 file:h-11 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:font-medium"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // The same file can be picked again after a failed upload.
              event.target.value = '';
              if (!file) return;
              const found = imageProblem(file);
              setProblem(found);
              if (!found) setLogo.mutate({ data: { file } });
            }}
          />
        </div>
      </div>
      {problem && <p className="text-sm text-destructive">{t(problem)}</p>}
      <ErrorText error={setLogo.error} />
    </div>
  );
}

function DayRow({
  day,
  control,
  register,
}: {
  day: Day;
  control: Control<HoursForm>;
  register: UseFormRegister<HoursForm>;
}) {
  const { t } = useTranslation();
  const isOpen = useWatch({ control, name: `${day}.isOpen` });
  const dayName = t(`settings.days.${day}`);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Controller
        control={control}
        name={`${day}.isOpen`}
        render={({ field }) => (
          <Label className="flex h-11 w-40 items-center gap-3">
            <Checkbox
              className="size-6"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            {dayName}
          </Label>
        )}
      />
      {isOpen ? (
        <span className="flex items-center gap-2">
          <Input
            type="time"
            required
            aria-label={t('settings.opensAt', { day: dayName })}
            className="h-11 w-32 text-base"
            {...register(`${day}.open`)}
          />
          –
          <Input
            type="time"
            required
            aria-label={t('settings.closesAt', { day: dayName })}
            className="h-11 w-32 text-base"
            {...register(`${day}.close`)}
          />
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          {t('settings.closed')}
        </span>
      )}
    </li>
  );
}

function HoursFormSection({ cafe }: { cafe: CafeDto }) {
  const { t } = useTranslation();
  const update = useCafesControllerUpdate(useCafeMutationOptions());
  const { register, handleSubmit, control } = useForm<HoursForm>({
    defaultValues: toHoursForm(cafe.workingHours),
  });
  const onSubmit = handleSubmit((form) =>
    update.mutate({ data: { workingHours: toHoursDto(form) } }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ul className="space-y-2">
        {DAYS.map((day) => (
          <DayRow key={day} day={day} control={control} register={register} />
        ))}
      </ul>
      <ErrorText error={update.error} />
      <div className="flex items-center gap-3">
        <Button type="submit" className="h-11 px-6" disabled={update.isPending}>
          {t('common.save')}
        </Button>
        <SavedNote visible={update.isSuccess} />
      </div>
    </form>
  );
}

function TelegramForm({ cafe }: { cafe: CafeDto }) {
  const { t } = useTranslation();
  const options = useCafeMutationOptions();
  const [token, setToken] = useState('');
  const [invalid, setInvalid] = useState(false);
  const save = useCafesControllerSetTelegramBot({
    mutation: {
      onSuccess: (updated) => {
        options.mutation.onSuccess(updated);
        // The token should not stay on screen or in memory once it is stored.
        setToken('');
      },
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const value = token.trim();
        const valid = TELEGRAM_TOKEN.test(value);
        setInvalid(!valid);
        if (valid) save.mutate({ data: { token: value } });
      }}
    >
      {cafe.telegramBot && (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <Check className="size-4" />
          {t('settings.telegram.saved')}
        </p>
      )}
      <FormField
        id="telegram-token"
        label={t('settings.telegram.token')}
        hint={t('settings.telegram.hint')}
        type="password"
        autoComplete="off"
        error={invalid ? 'settings.telegram.invalid' : undefined}
        value={token}
        onChange={(event) => setToken(event.target.value)}
      />
      <ErrorText error={save.error} />
      <Button
        type="submit"
        className="h-11 px-6"
        disabled={save.isPending || token.trim() === ''}
      >
        <Send />
        {t(cafe.telegramBot ? 'settings.telegram.replace' : 'common.save')}
      </Button>
    </form>
  );
}

function ScreenLink({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const url = `${window.location.origin}/screen/${slug}`;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('settings.screen.hint')}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-5')}
      >
        <MonitorPlay />
        {t('settings.screen.open')}
      </a>
      <p className="text-sm break-all text-muted-foreground">{url}</p>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const cafe = useCafesControllerCurrent();

  return (
    <Page title={t('nav.settings')}>
      {!cafe.data ? (
        <QueryState
          isPending={cafe.isPending}
          error={cafe.error}
          refetch={cafe.refetch}
        />
      ) : (
        <div className="max-w-2xl space-y-4">
          <Section title={t('settings.sections.cafe')}>
            <CafeForm cafe={cafe.data} />
          </Section>
          <Section title={t('settings.sections.logo')}>
            <LogoForm cafe={cafe.data} />
          </Section>
          <Section title={t('settings.sections.orders')}>
            <OrderSettingsForm cafe={cafe.data} />
          </Section>
          <Section title={t('settings.sections.hours')}>
            <HoursFormSection cafe={cafe.data} />
          </Section>
          <Section title={t('settings.sections.screen')}>
            <ScreenLink slug={cafe.data.slug} />
          </Section>
          <Section title={t('settings.sections.telegram')}>
            <TelegramForm cafe={cafe.data} />
          </Section>
        </div>
      )}
    </Page>
  );
}
