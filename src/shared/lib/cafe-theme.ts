const channels = (hex: string) =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

const toHex = (values: number[]) =>
  `#${values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function luminance(rgb: number[]) {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrastWithWhite = (hex: string) =>
  1.05 / (luminance(channels(hex)) + 0.05);

/**
 * The cafe picks any colour, and the panel uses it for white text on buttons and for
 * coloured text on light backgrounds. A pale one is darkened until both stay readable.
 */
export function readablePrimary(hex: string): string {
  let rgb = channels(hex);
  while (contrastWithWhite(toHex(rgb)) < 4.5) {
    rgb = rgb.map((value) => value * 0.94);
  }
  return toHex(rgb);
}

export function applyCafeTheme(color: string | null | undefined): () => void {
  const { style } = document.documentElement;
  const properties = ['--primary', '--ring', '--sidebar-primary'];
  if (color) {
    const primary = readablePrimary(color);
    properties.forEach((name) => style.setProperty(name, primary));
    style.setProperty('--primary-foreground', '#ffffff');
    style.setProperty('--sidebar-primary-foreground', '#ffffff');
  }
  return () =>
    [
      ...properties,
      '--primary-foreground',
      '--sidebar-primary-foreground',
    ].forEach((name) => style.removeProperty(name));
}
