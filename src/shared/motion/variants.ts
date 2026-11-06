import type { Transition, Variants } from 'motion/react';

export const SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
};

/** Put on a list; its `riseItem` children then arrive one after another. */
export const staggerList: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: SPRING },
};
