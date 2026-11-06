import { fireEvent, render, screen } from '@testing-library/react';
import { useShortcuts } from './use-shortcuts';

function Harness({ run }: { run: (name: string) => void }) {
  useShortcuts({
    s: () => run('s'),
    'ctrl+enter': () => run('send'),
    'alt+2': () => run('page'),
    'shift+/': () => run('help'),
    '/': () => run('search'),
  });
  return <input aria-label="field" />;
}

describe('useShortcuts', () => {
  const setUp = () => {
    const run = vi.fn();
    render(<Harness run={run} />);
    return run;
  };

  it('fires by physical key, so a Cyrillic layout works too', () => {
    const run = setUp();
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ы' });
    expect(run).toHaveBeenCalledWith('s');
  });

  it('knows modifiers, Cmd counting as Ctrl', () => {
    const run = setUp();
    fireEvent.keyDown(window, { code: 'Enter', metaKey: true });
    fireEvent.keyDown(window, { code: 'Digit2', altKey: true });
    fireEvent.keyDown(window, { code: 'Slash', shiftKey: true });
    fireEvent.keyDown(window, { code: 'Slash' });
    expect(run.mock.calls.flat()).toEqual(['send', 'page', 'help', 'search']);
  });

  it('leaves typing alone, unless a modifier is held', () => {
    const run = setUp();
    const field = screen.getAllByLabelText('field')[0];
    fireEvent.keyDown(field, { code: 'KeyS' });
    expect(run).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { code: 'Enter', ctrlKey: true });
    expect(run).toHaveBeenCalledWith('send');
  });

  it('stays quiet behind an open dialog and on a held key', () => {
    const run = setUp();
    fireEvent.keyDown(window, { code: 'KeyS', repeat: true });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    fireEvent.keyDown(window, { code: 'KeyS' });
    dialog.remove();
    expect(run).not.toHaveBeenCalled();
  });
});
