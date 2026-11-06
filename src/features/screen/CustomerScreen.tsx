import { CheckCircle2, Flame, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { io } from 'socket.io-client';
import { cn } from '@/lib/utils';
import { API_URL } from '@/shared/api/client';
import { usePublicControllerScreen } from '@/shared/api/generated/public/public';
import { applyCafeTheme } from '@/shared/lib/cafe-theme';
import { playChime } from '@/shared/lib/chime';
import { SoundHint } from '@/shared/ui/SoundHint';

/** In case a socket event goes missing: this screen stays on all day with nobody watching. */
const REFETCH_MS = 30_000;

function Column({
  title,
  icon: Icon,
  numbers,
  empty,
  ready = false,
}: {
  title: string;
  icon: LucideIcon;
  numbers: string[];
  empty: string;
  ready?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex min-h-0 flex-col gap-4 rounded-3xl p-4 md:p-6',
        ready ? 'bg-emerald-950' : 'bg-white/5',
      )}
    >
      <h2
        className={cn(
          'flex items-center gap-3 text-2xl font-bold md:text-4xl',
          ready ? 'text-emerald-300' : 'text-amber-300',
        )}
      >
        <Icon className="size-8 md:size-10" />
        {title}
      </h2>
      <ul className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] content-start gap-3 overflow-hidden md:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
        <AnimatePresence initial={false}>
          {numbers.map((number, index) => (
            <motion.li
              // A number can repeat for a moment around midnight, when the count restarts.
              key={`${number}-${numbers.indexOf(number) === index ? 0 : index}`}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'flex aspect-[3/2] items-center justify-center rounded-2xl font-heading text-5xl font-bold tabular-nums md:text-7xl',
                ready
                  ? 'bg-emerald-500 text-emerald-950'
                  : 'bg-white/10 text-white',
              )}
            >
              {number}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {numbers.length === 0 && (
        <p className="flex-1 text-center text-xl text-white/50">{empty}</p>
      )}
    </section>
  );
}

/** The monitor customers watch to know when to come for their order. */
export function CustomerScreen() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const screen = usePublicControllerScreen(slug, {
    query: { refetchInterval: REFETCH_MS, retry: 1 },
  });
  const { refetch } = screen;
  const ready = screen.data?.ready;
  const primaryColor = screen.data?.primaryColor;

  useEffect(() => {
    const socket = io(API_URL, { auth: { screen: slug } });
    const refresh = () => void refetch();
    socket.on('connect', refresh);
    socket.on('screen.changed', refresh);
    return () => {
      socket.disconnect();
    };
  }, [slug, refetch]);

  useEffect(() => applyCafeTheme(primaryColor), [primaryColor]);

  // Not on first load: only an order that has just become ready is news.
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (known.current && ready.some((number) => !known.current?.has(number))) {
      playChime();
    }
    known.current = new Set(ready);
  }, [ready]);

  if (!screen.data) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-950 text-2xl text-white/70">
        {screen.isError ? t('screen.notFound') : t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col gap-4 bg-neutral-950 p-4 text-white md:p-6">
      <header className="flex shrink-0 items-center gap-4">
        {screen.data.logoUrl && (
          <img
            src={screen.data.logoUrl}
            alt=""
            className="size-12 rounded-xl object-cover md:size-16"
          />
        )}
        <h1 className="flex-1 text-2xl font-bold md:text-4xl">
          {screen.data.cafeName}
        </h1>
        <p className="hidden text-lg text-white/70 md:block md:text-2xl">
          {t('screen.hint')}
        </p>
      </header>
      <main className="grid min-h-0 flex-1 grid-rows-2 gap-4 md:grid-cols-[2fr_3fr] md:grid-rows-1">
        <Column
          title={t('screen.preparing')}
          icon={Flame}
          numbers={screen.data.preparing}
          empty={t('screen.nothingPreparing')}
        />
        <Column
          ready
          title={t('screen.ready')}
          icon={CheckCircle2}
          numbers={screen.data.ready}
          empty={t('screen.nothingReady')}
        />
      </main>
      <SoundHint />
    </div>
  );
}
