import {
  AlertTriangle,
  BellRing,
  Check,
  ExternalLink,
  Send,
  Unplug,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useTelegramSettingsControllerConnect,
  useTelegramSettingsControllerDisconnect,
  useTelegramSettingsControllerSendTest,
} from '@/shared/api/generated/cafes/cafes';
import type { CafeDto } from '@/shared/api/generated/model';
import { celebrate } from '@/shared/ui/Celebration';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FormField } from '@/shared/ui/FormField';
import { useCafeMutationOptions } from './settings-parts';

const TELEGRAM_TOKEN = /^\d{5,20}:[A-Za-z0-9_-]{30,64}$/;
/** What the API says when it has no https address for Telegram to call. */
const NEEDS_HTTPS = 'NEEDS_HTTPS';

function TokenForm({ replacing }: { replacing: boolean }) {
  const { t } = useTranslation();
  const options = useCafeMutationOptions();
  const [token, setToken] = useState('');
  const [invalid, setInvalid] = useState(false);
  const connect = useTelegramSettingsControllerConnect({
    mutation: {
      onSuccess: (cafe: CafeDto) => {
        options.mutation.onSuccess(cafe);
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
        if (valid) connect.mutate({ data: { token: value } });
      }}
    >
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
      <ErrorText error={connect.error} />
      <Button
        type="submit"
        variant={replacing ? 'outline' : 'default'}
        className="h-11 px-6"
        disabled={connect.isPending || token.trim() === ''}
      >
        <Send />
        {t(
          replacing ? 'settings.telegram.replace' : 'settings.telegram.connect',
        )}
      </Button>
    </form>
  );
}

function ConnectedBot({ bot }: { bot: NonNullable<CafeDto['telegramBot']> }) {
  const { t } = useTranslation();
  const options = useCafeMutationOptions();
  const [confirming, setConfirming] = useState(false);
  const sendTest = useTelegramSettingsControllerSendTest({
    mutation: { onSuccess: () => celebrate(t('settings.telegram.testSent')) },
  });
  const disconnect = useTelegramSettingsControllerDisconnect({
    mutation: {
      onSuccess: (cafe: CafeDto) => {
        options.mutation.onSuccess(cafe);
        setConfirming(false);
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`https://t.me/${bot.username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-lg font-semibold text-primary hover:underline"
        >
          @{bot.username}
          <ExternalLink className="size-4" />
        </a>
        {bot.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <Check className="size-3.5" />
            {t('settings.telegram.active')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
            <AlertTriangle className="size-3.5" />
            {t('settings.telegram.inactive')}
          </span>
        )}
      </div>
      {bot.error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {bot.error === NEEDS_HTTPS
            ? t('settings.telegram.needsHttps')
            : t('settings.telegram.telegramSaid', { error: bot.error })}
        </p>
      )}

      <div className="space-y-2 rounded-xl bg-muted/60 p-3">
        <p className="flex items-center gap-2 font-medium">
          <BellRing className="size-4" />
          {t('settings.telegram.notifications')}
        </p>
        {bot.notificationsLinked ? (
          <>
            <p className="text-sm text-emerald-800">
              {t('settings.telegram.linked')}
            </p>
            <ErrorText error={sendTest.error} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11"
                disabled={sendTest.isPending}
                onClick={() => sendTest.mutate()}
              >
                <Send />
                {t('settings.telegram.test')}
              </Button>
              {bot.linkUrl && (
                <a
                  href={bot.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'ghost' }), 'h-11')}
                >
                  {t('settings.telegram.relink')}
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t('settings.telegram.linkHint')}
            </p>
            {bot.linkUrl && (
              <a
                href={bot.linkUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants(), 'h-11 px-5')}
              >
                <BellRing />
                {t('settings.telegram.link')}
              </a>
            )}
          </>
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          {t('settings.telegram.more')}
        </summary>
        <div className="mt-3 space-y-4">
          <TokenForm replacing />
          <Button
            variant="ghost"
            className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Unplug />
            {t('settings.telegram.disconnect')}
          </Button>
        </div>
      </details>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('settings.telegram.disconnectTitle', { name: bot.username })}
        description={t('settings.telegram.disconnectHint')}
        confirmLabel={t('settings.telegram.disconnect')}
        pending={disconnect.isPending}
        error={disconnect.error}
        onConfirm={() => disconnect.mutate()}
      />
    </div>
  );
}

/** The cafe's own bot: connect it, link the chat that hears about orders, test it. */
export function TelegramSection({ cafe }: { cafe: CafeDto }) {
  const { t } = useTranslation();
  if (!cafe.telegramBot) {
    return (
      <div className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t('settings.telegram.step1')}</li>
          <li>{t('settings.telegram.step2')}</li>
          <li>{t('settings.telegram.step3')}</li>
        </ol>
        <TokenForm replacing={false} />
      </div>
    );
  }
  return <ConnectedBot bot={cafe.telegramBot} />;
}
