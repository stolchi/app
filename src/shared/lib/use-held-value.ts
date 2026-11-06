import { useState } from 'react';

/**
 * Keeps the last non-null value. A dialog stays on screen while it animates closed,
 * after its state is already cleared, and should not flash empty in that moment.
 */
export function useHeldValue<T>(value: T | null): T | null {
  const [held, setHeld] = useState(value);
  if (value !== null && value !== held) setHeld(value);
  return value ?? held;
}
