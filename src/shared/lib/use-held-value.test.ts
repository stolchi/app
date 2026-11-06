import { renderHook } from '@testing-library/react';
import { useHeldValue } from '@/shared/lib/use-held-value';

describe('useHeldValue', () => {
  it('keeps the last value after it is cleared, and follows a new one', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null }) => useHeldValue(value),
      { initialProps: { value: null as string | null } },
    );
    expect(result.current).toBeNull();
    rerender({ value: 'a' });
    expect(result.current).toBe('a');
    rerender({ value: null });
    expect(result.current).toBe('a');
    rerender({ value: 'b' });
    expect(result.current).toBe('b');
  });
});
