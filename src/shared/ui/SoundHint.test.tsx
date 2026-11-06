import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import uz from '@/shared/i18n/uz.json';
import '@/shared/i18n';
import { SoundHint } from './SoundHint';

describe('SoundHint', () => {
  afterEach(cleanup);

  it('stays through the press, so the tap is not lost, and goes after the click', () => {
    render(<SoundHint />);
    const hint = screen.getByRole('button', { name: uz.common.enableSound });
    fireEvent.pointerDown(hint);
    expect(hint).toBeInTheDocument();
    fireEvent.click(hint);
    expect(
      screen.queryByRole('button', { name: uz.common.enableSound }),
    ).toBeNull();
  });
});
