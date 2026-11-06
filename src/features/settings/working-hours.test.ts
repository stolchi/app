import { toHoursDto, toHoursForm } from './working-hours';

describe('working hours', () => {
  it('survives the round trip, leaving closed days out', () => {
    const hours = {
      mon: { open: '08:30', close: '23:00' },
      sat: { open: '10:00', close: '02:00' },
    };
    expect(toHoursDto(toHoursForm(hours))).toEqual(hours);
  });

  it('starts unset hours as closed, with sensible times to edit', () => {
    const form = toHoursForm(null);
    expect(form.mon).toEqual({ isOpen: false, open: '09:00', close: '22:00' });
    expect(toHoursDto(form)).toBeNull();
  });
});
