import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { create } from 'zustand';
import { prefersReducedMotion } from '@/shared/motion/reduced-motion';

const VISIBLE_MS = 1300;
const COLORS = ['#b4532a', '#e0a030', '#4f8a5b', '#d9734e', '#7a5c99'];
const PIECES = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2;
  const distance = 90 + (index % 3) * 34;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: COLORS[index % COLORS.length],
  };
});

const useCelebration = create<{ message: string | null; id: number }>(() => ({
  message: null,
  id: 0,
}));

/** A brief "done!" over the screen, for the moments worth marking. */
export function celebrate(message: string) {
  useCelebration.setState(({ id }) => ({ message, id: id + 1 }));
}

export function Celebration() {
  const { message, id } = useCelebration();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(
      () => useCelebration.setState({ message: null }),
      VISIBLE_MS,
    );
    return () => clearTimeout(timer);
  }, [message, id]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={id}
          role="status"
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative flex flex-col items-center gap-3">
            {!prefersReducedMotion() &&
              PIECES.map((piece, index) => (
                <motion.span
                  key={index}
                  className="absolute top-8 size-2.5 rounded-sm"
                  style={{ backgroundColor: piece.color }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    x: piece.x,
                    y: piece.y,
                    opacity: 0,
                    rotate: 200,
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              ))}
            <motion.span
              className="flex size-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl"
              initial={{ scale: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <Check className="size-10" strokeWidth={3} />
            </motion.span>
            <span className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-lg">
              {message}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
