import { normalizePhone } from '@/shared/lib/phone';

describe('normalizePhone', () => {
  it.each([
    ['+998901234567', '+998901234567'],
    ['+998 90 123-45-67', '+998901234567'],
    ['(90) 123 45 67', '+998901234567'],
    ['901234567', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['+998+998901234567', '+998901234567'],
    // A real number whose own digits start with 998.
    ['+998998123456', '+998998123456'],
    ['998123456', '+998998123456'],
  ])('reads %s as %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['+998', '12345', '+7 900 123 45 67'])(
    'leaves %s for validation to refuse',
    (input) => {
      expect(normalizePhone(input)).toBe(input);
    },
  );
});
