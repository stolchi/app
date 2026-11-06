import { animate } from 'motion/react';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './reduced-motion';

/** Counts to a new value. `format` must be a stable function. */
export function AnimatedNumber({
  value,
  format = String,
  from,
}: {
  value: number;
  format?: (value: number) => string;
  /** Where the very first count starts. Without it the first value just appears. */
  from?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(from ?? value);

  useEffect(() => {
    const element = ref.current;
    if (!element || shown.current === value) return;
    if (prefersReducedMotion()) {
      shown.current = value;
      element.textContent = format(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.55,
      ease: 'easeOut',
      onUpdate: (current) => {
        shown.current = current;
        element.textContent = format(Math.round(current));
      },
      onComplete: () => {
        shown.current = value;
        element.textContent = format(value);
      },
    });
    return () => controls.stop();
  }, [value, format]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}
