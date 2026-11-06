import { formatMoney, formatTime, sortByName, todayInTashkent } from './format';

describe('format', () => {
  it('groups thousands', () => {
    expect(formatMoney(0)).toBe("0 so'm");
    expect(formatMoney(999)).toBe("999 so'm");
    expect(formatMoney(1234567)).toBe("1 234 567 so'm");
  });

  it('uses Tashkent time, not the time zone of the device', () => {
    expect(formatTime('2026-01-31T20:30:00Z')).toBe('01:30');
    expect(todayInTashkent(new Date('2026-01-31T20:30:00Z'))).toBe(
      '2026-02-01',
    );
  });

  it('sorts names the way people count', () => {
    const names = sortByName([
      { name: 'Stol 10' },
      { name: 'Stol 2' },
      { name: 'Stol 1' },
    ]).map((table) => table.name);
    expect(names).toEqual(['Stol 1', 'Stol 2', 'Stol 10']);
  });
});
