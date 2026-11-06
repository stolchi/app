import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SPRING } from '@/shared/motion/variants';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** The element a chosen product flies to. */
  cartTarget?: boolean;
}

/** Choices with a marker that slides to the chosen one. */
export function Segmented<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  tone = 'soft',
  className,
  itemClassName,
}: {
  /** Unique on the page: it links the marker's positions together. */
  id: string;
  label?: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  tone?: 'soft' | 'solid';
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex gap-1 rounded-2xl bg-muted p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            data-cart-target={option.cartTarget ? '' : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative min-h-11 shrink-0 rounded-xl px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]',
              active
                ? tone === 'solid'
                  ? 'text-primary-foreground'
                  : 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              itemClassName,
            )}
          >
            {active && (
              <motion.span
                layoutId={id}
                transition={SPRING}
                className={cn(
                  'absolute inset-0 rounded-xl shadow-sm',
                  tone === 'solid' ? 'bg-primary' : 'bg-card',
                )}
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5 whitespace-nowrap [&_svg]:size-4">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
