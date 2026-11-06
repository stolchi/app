import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { prefersReducedMotion } from '@/shared/motion/reduced-motion';

export function EmptyState({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 p-10 text-center text-muted-foreground">
      <motion.span
        className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        animate={prefersReducedMotion() ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="size-6" />
      </motion.span>
      <p className="max-w-xs text-sm">{children}</p>
    </div>
  );
}
