import { useEffect, useEffectEvent } from 'react';

/**
 * Physical keys, not letters: the same key works on Latin and Cyrillic layouts,
 * and both are common here.
 */
export function shortcutOf(event: KeyboardEvent): string {
  const { code } = event;
  const key = code.startsWith('Key')
    ? code.slice(3).toLowerCase()
    : code.startsWith('Digit')
      ? code.slice(5)
      : code === 'Slash'
        ? '/'
        : code.toLowerCase();
  return [
    (event.ctrlKey || event.metaKey) && 'ctrl',
    event.altKey && 'alt',
    event.shiftKey && 'shift',
    key,
  ]
    .filter(Boolean)
    .join('+');
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const dialogIsOpen = () =>
  // One that is only animating closed no longer counts.
  document.querySelector(
    '[role="dialog"]:not([data-closed]), [role="alertdialog"]:not([data-closed])',
  ) !== null;

/**
 * Keys pressed while typing stay text, unless they have a modifier, and an open
 * dialog keeps the keyboard to itself. Touch devices never get here at all.
 */
export function useShortcuts(
  shortcuts: Record<string, (() => void) | undefined>,
) {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || dialogIsOpen()) return;
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    if (!hasModifier && isTyping(event.target)) return;
    const run = shortcuts[shortcutOf(event)];
    if (!run) return;
    event.preventDefault();
    run();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
