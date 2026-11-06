import {
  Armchair,
  Banknote,
  Check,
  ChevronRight,
  ClipboardList,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useCafesControllerCurrent } from '@/shared/api/generated/cafes/cafes';
import { useDashboardControllerToday } from '@/shared/api/generated/dashboard/dashboard';
import { useProductsControllerList } from '@/shared/api/generated/products/products';
import { useTablesControllerList } from '@/shared/api/generated/tables/tables';
import { useSessionStore } from '@/shared/auth/session-store';
import { formatMoney } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/motion/AnimatedNumber';
import { riseItem, staggerList } from '@/shared/motion/variants';
import { Page } from '@/shared/ui/Page';
import { QueryState } from '@/shared/ui/QueryState';
import { TopProductsChart } from './TopProductsChart';

/** Walks a new cafe through setting up, and goes away once it is done. */
function GettingStarted() {
  const { t } = useTranslation();
  const products = useProductsControllerList();
  const tables = useTablesControllerList();
  const cafe = useCafesControllerCurrent();
  if (!products.data || !tables.data || !cafe.data) return null;

  const steps = [
    { key: 'menu', to: '/menu', done: products.data.length > 0 },
    { key: 'tables', to: '/tables', done: tables.data.length > 0 },
    {
      key: 'settings',
      to: '/settings',
      done: Boolean(cafe.data.phone || cafe.data.logoUrl),
    },
  ];
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;

  return (
    <motion.section
      variants={riseItem}
      className="rounded-2xl border border-primary/25 bg-primary/5 p-5"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Rocket className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{t('dashboard.startTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.startProgress', { done, total: steps.length })}
          </p>
        </div>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-primary/15">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(done / steps.length) * 100}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className="flex min-h-12 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-primary/10"
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  step.done
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-primary/40',
                )}
              >
                {step.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'flex-1 text-sm font-medium',
                  step.done && 'text-muted-foreground line-through',
                )}
              >
                {t(`dashboard.steps.${step.key}`)}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  format,
  hero,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  /** Says exactly what is being counted. */
  hint: string;
  value: number;
  format?: (value: number) => string;
  hero?: boolean;
}) {
  return (
    <motion.div
      variants={riseItem}
      whileHover={{ y: -3 }}
      className={cn(
        'rounded-2xl border p-5 shadow-xs',
        hero
          ? 'border-transparent bg-sidebar text-sidebar-foreground sm:col-span-2 lg:col-span-1'
          : 'bg-card',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-sm',
          !hero && 'text-muted-foreground',
        )}
      >
        <Icon className={cn('size-4', hero && 'text-amber-400')} />
        {label}
      </p>
      <p
        className={cn(
          'mt-2 font-heading text-4xl font-bold',
          hero && 'text-white',
        )}
      >
        <AnimatedNumber value={value} from={0} format={format} />
      </p>
      <p
        className={cn(
          'mt-1 text-sm',
          hero ? 'text-sidebar-foreground/75' : 'text-muted-foreground',
        )}
      >
        {hint}
      </p>
    </motion.div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const isOwner = useSessionStore(
    (state) => state.user?.role?.systemKey === 'OWNER',
  );
  const today = useDashboardControllerToday();

  return (
    <Page
      title={t('dashboard.title')}
      actions={
        <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
            <span className="relative size-2 rounded-full bg-emerald-600" />
          </span>
          {t('dashboard.live')}
        </span>
      }
    >
      {!today.data ? (
        <QueryState
          isPending={today.isPending}
          error={today.error}
          refetch={today.refetch}
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerList}
          initial="hidden"
          animate="shown"
        >
          {isOwner && <GettingStarted />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              hero
              icon={Banknote}
              label={t('dashboard.revenue')}
              hint={t('dashboard.revenueHint')}
              value={today.data.revenue}
              format={formatMoney}
            />
            <Stat
              icon={ClipboardList}
              label={t('dashboard.orders')}
              hint={t('dashboard.ordersHint')}
              value={today.data.orderCount}
            />
            <Stat
              icon={Armchair}
              label={t('dashboard.activeTables')}
              hint={t('dashboard.activeTablesHint')}
              value={today.data.activeTables}
            />
          </div>
          <motion.section
            variants={riseItem}
            className="rounded-2xl border bg-card p-5 shadow-xs"
          >
            <h2 className="text-lg font-bold">{t('dashboard.topProducts')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('dashboard.topProductsHint')}
            </p>
            {today.data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('dashboard.noSales')}
              </p>
            ) : (
              <TopProductsChart products={today.data.topProducts} />
            )}
          </motion.section>
        </motion.div>
      )}
    </Page>
  );
}
