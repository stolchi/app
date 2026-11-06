import {
  CakeSlice,
  ChefHat,
  Coffee,
  Pizza,
  QrCode,
  Salad,
  ShoppingCart,
  Soup,
  Store,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { prefersReducedMotion } from '@/shared/motion/reduced-motion';
import { riseItem, staggerList } from '@/shared/motion/variants';

const POINTS = [
  { key: 'menu', icon: QrCode },
  { key: 'kitchen', icon: ChefHat },
  { key: 'pos', icon: ShoppingCart },
] as const;

const FLOATING = [
  { icon: Soup, className: 'top-[12%] right-[14%] size-14', duration: 5 },
  { icon: Coffee, className: 'top-[38%] right-[6%] size-10', duration: 4 },
  { icon: Pizza, className: 'bottom-[10%] right-[20%] size-16', duration: 6 },
  { icon: Salad, className: 'top-[6%] left-[46%] size-10', duration: 4.5 },
  {
    icon: CakeSlice,
    className: 'bottom-[6%] left-[38%] size-9',
    duration: 5.5,
  },
];

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  const { t } = useTranslation();
  const still = prefersReducedMotion();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        {FLOATING.map(({ icon: Icon, className, duration }, index) => (
          <motion.span
            key={index}
            aria-hidden
            className={`absolute text-amber-300/25 ${className}`}
            animate={still ? undefined : { y: [0, -16, 0], rotate: [0, 6, 0] }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="size-full" strokeWidth={1.5} />
          </motion.span>
        ))}
        <p className="relative flex items-center gap-2 font-heading text-2xl font-bold">
          <Store className="size-7 text-amber-400" />
          {t('brand.name')}
        </p>
        <motion.div
          className="relative"
          variants={staggerList}
          initial="hidden"
          animate="shown"
        >
          <motion.h2
            variants={riseItem}
            className="max-w-md text-5xl leading-[1.1] font-bold"
          >
            {t('brand.tagline')}
          </motion.h2>
          <ul className="mt-10 max-w-md space-y-4">
            {POINTS.map(({ key, icon: Icon }) => (
              <motion.li
                key={key}
                variants={riseItem}
                className="flex items-start gap-3 text-white/85"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                  <Icon className="size-5" />
                </span>
                {t(`brand.points.${key}`)}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <motion.div
          className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl shadow-foreground/5 sm:p-8"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <p className="mb-6 flex items-center gap-2 font-heading text-2xl font-bold text-primary lg:hidden">
            <Store className="size-7" />
            {t('brand.name')}
          </p>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 mb-7 text-muted-foreground">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
