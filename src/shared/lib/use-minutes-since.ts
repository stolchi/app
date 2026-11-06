import { useEffect, useState } from 'react';

/** Whole minutes since a moment, kept current while a screen stays open. */
export function useMinutesSince() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return (iso: string) =>
    Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}
