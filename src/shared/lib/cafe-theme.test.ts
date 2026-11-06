import { contrastWithWhite, readablePrimary } from './cafe-theme';

describe('cafe colour', () => {
  it('keeps a colour that is already readable', () => {
    expect(readablePrimary('#7a2e12')).toBe('#7a2e12');
  });

  it.each(['#ffff00', '#ffffff', '#ffe0b0', '#00ff88'])(
    'darkens %s until white text is readable on it',
    (color) => {
      expect(contrastWithWhite(readablePrimary(color))).toBeGreaterThanOrEqual(
        4.5,
      );
    },
  );
});
