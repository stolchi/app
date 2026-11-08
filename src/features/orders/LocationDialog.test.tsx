import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { LocationField } from './LocationField';

vi.mock('./MapPicker', () => ({ default: () => <div>map</div> }));

describe('LocationField', () => {
  afterEach(cleanup);

  it('reads a pasted link, and keeps the form around it from submitting', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) =>
      event.preventDefault(),
    );
    render(
      <form onSubmit={onSubmit}>
        <LocationField value={null} onChange={onChange} />
      </form>,
    );
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.pick }),
    );
    await userEvent.type(
      await screen.findByLabelText(uz.location.link),
      'https://yandex.uz/maps/?pt=69.203412,41.285601{Enter}',
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('41.285601, 69.203412')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.confirm }),
    );
    expect(onChange).toHaveBeenCalledWith({
      latitude: 41.285601,
      longitude: 69.203412,
    });
  });

  it('says so when a link has no point in it', async () => {
    render(<LocationField value={null} onChange={vi.fn()} />);
    await userEvent.click(
      screen.getByRole('button', { name: uz.location.pick }),
    );
    await userEvent.type(
      await screen.findByLabelText(uz.location.link),
      'https://maps.app.goo.gl/abc{Enter}',
    );
    expect(screen.getByText(uz.location.unreadable)).toBeInTheDocument();
  });
});
