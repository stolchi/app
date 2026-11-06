import { cn } from '@/lib/utils';
import { assetUrl } from '@/shared/lib/assets';

const GRADIENTS = [
  'from-orange-300 to-rose-400',
  'from-amber-300 to-orange-500',
  'from-lime-300 to-emerald-500',
  'from-teal-300 to-cyan-600',
  'from-rose-300 to-fuchsia-500',
  'from-yellow-300 to-amber-500',
];

/** Always the same colour for the same name, so that a dish is easy to find again. */
export function gradientFor(name: string) {
  const hash = [...name].reduce(
    (sum, letter) => (sum * 31 + letter.charCodeAt(0)) % 9973,
    7,
  );
  return GRADIENTS[hash % GRADIENTS.length];
}

/** The product's photo, or a colourful stand-in with its first letter. */
export function FoodThumb({
  name,
  imageUrl,
  className,
  flyable,
}: {
  name: string;
  imageUrl: string | null;
  className?: string;
  /** Marks the element that flies into the cart. */
  flyable?: boolean;
}) {
  return imageUrl ? (
    <img
      src={assetUrl(imageUrl)}
      alt=""
      loading="lazy"
      data-fly-thumb={flyable ? '' : undefined}
      className={cn('object-cover', className)}
    />
  ) : (
    <span
      aria-hidden
      data-fly-thumb={flyable ? '' : undefined}
      className={cn(
        'flex items-center justify-center bg-gradient-to-br font-heading font-bold text-white/90',
        gradientFor(name),
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
