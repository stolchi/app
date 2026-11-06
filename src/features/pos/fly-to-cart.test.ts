import { flyToCart } from './fly-to-cart';

function setUp() {
  document.body.innerHTML = `
    <div id="source"></div>
    <button id="hidden" data-cart-target></button>
    <button id="cart" data-cart-target></button>`;
  const rect = (x: number, size: number) => () =>
    ({ left: x, top: 0, width: size, height: size }) as DOMRect;
  const source = document.getElementById('source')!;
  source.getBoundingClientRect = rect(0, 100);
  document.getElementById('hidden')!.getBoundingClientRect = rect(0, 0);
  const cart = document.getElementById('cart')!;
  cart.getBoundingClientRect = rect(500, 50);

  const flights: { onfinish: (() => void) | null; keyframes: Keyframe[] }[] =
    [];
  const animate = vi.fn((keyframes: Keyframe[]) => {
    const flight = { onfinish: null, oncancel: null, keyframes };
    flights.push(flight);
    return flight;
  });
  HTMLElement.prototype.animate = animate as never;
  return { source, cart, flights, animate };
}

const flyers = () => document.querySelectorAll('[aria-hidden="true"]');

describe('flyToCart', () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('flies a copy to the visible cart, removes it and bounces the cart', () => {
    const { source, flights, animate } = setUp();
    flyToCart(source);
    expect(flyers()).toHaveLength(1);
    expect(flights[0].keyframes.at(-1)?.transform).toContain(
      'translate(475px, -25px)',
    );

    flights[0].onfinish?.();
    expect(flyers()).toHaveLength(0);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(document.getElementById('source')).not.toBeNull();
  });

  it('skips the flight for people who asked for less motion', () => {
    const { source, animate } = setUp();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    flyToCart(source);
    expect(animate).not.toHaveBeenCalled();
    expect(flyers()).toHaveLength(0);
  });

  it('does nothing when no cart is on screen', () => {
    const { source, cart, animate } = setUp();
    cart.remove();
    document.getElementById('hidden')?.remove();
    flyToCart(source);
    expect(animate).not.toHaveBeenCalled();
  });
});
