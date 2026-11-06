import { prefersReducedMotion } from '@/shared/motion/reduced-motion';

const DURATION_MS = 620;
const STEPS = 16;

/** The tablet and phone layouts each have their own cart button; only one is showing. */
function visibleCart(): HTMLElement | null {
  const targets = document.querySelectorAll<HTMLElement>('[data-cart-target]');
  return (
    [...targets].find((target) => {
      const { width, height } = target.getBoundingClientRect();
      return width > 0 && height > 0;
    }) ?? null
  );
}

/**
 * Sends a copy of the picture along an arc into the cart, which bounces on landing.
 * The cart itself has already been updated: this is only what the eye sees, so fast
 * taps stay correct and nothing depends on an animation finishing.
 */
export function flyToCart(source: HTMLElement): void {
  if (prefersReducedMotion() || typeof source.animate !== 'function') return;
  const cart = visibleCart();
  if (!cart) return;

  const from = source.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const lift = Math.min(160, 50 + Math.abs(dx) * 0.2);

  const flyer = source.cloneNode(true) as HTMLElement;
  flyer.removeAttribute('data-fly-thumb');
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '60',
    pointerEvents: 'none',
    borderRadius: '1rem',
    boxShadow: '0 12px 30px rgb(0 0 0 / 0.25)',
  });
  document.body.append(flyer);

  const keyframes = Array.from({ length: STEPS + 1 }, (_, index) => {
    const p = index / STEPS;
    const x = dx * p;
    const y = dy * p - 4 * lift * p * (1 - p);
    return {
      transform: `translate(${x}px, ${y}px) scale(${1 - 0.84 * p}) rotate(${16 * p}deg)`,
      opacity: p > 0.9 ? 0.5 : 1,
    };
  });
  const flight = flyer.animate(keyframes, {
    duration: DURATION_MS,
    easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
  });
  flight.oncancel = () => flyer.remove();
  flight.onfinish = () => {
    flyer.remove();
    cart.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.16)' },
        { transform: 'scale(0.96)' },
        { transform: 'scale(1)' },
      ],
      { duration: 320, easing: 'ease-out' },
    );
  };
}
