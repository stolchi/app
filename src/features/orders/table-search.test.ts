import { groupByZone, nextTableNumber, searchTables } from './table-search';

const table = (name: string, zone: string | null = null) => ({ name, zone });
const names = (tables: { name: string }[]) => tables.map(({ name }) => name);

describe('searchTables', () => {
  const tables = [
    table('Stol 1'),
    table('Stol 5', '1-qavat'),
    table('Stol 15', '2-qavat'),
    table('Ayvon 5', "Yoz bog'i"),
  ];

  it('returns everything for an empty search', () => {
    expect(searchTables(tables, '  ')).toHaveLength(4);
  });

  it('puts the exact number first, so Enter picks the right table', () => {
    expect(names(searchTables(tables, '15'))).toEqual(['Stol 15']);
    expect(names(searchTables(tables, '5')).slice(0, 2)).toEqual([
      'Stol 5',
      'Ayvon 5',
    ]);
    expect(names(searchTables(tables, '5')).at(-1)).toBe('Stol 15');
  });

  it('searches zones, combines words, and ignores case and apostrophes', () => {
    expect(names(searchTables(tables, '2-QAVAT'))).toEqual(['Stol 15']);
    expect(names(searchTables(tables, 'stol 1-qavat'))).toEqual(['Stol 5']);
    expect(names(searchTables(tables, 'bogi'))).toEqual(['Ayvon 5']);
    expect(searchTables(tables, 'yoq')).toEqual([]);
  });
});

describe('groupByZone', () => {
  it('sorts zones and tables naturally, with no zone last', () => {
    const groups = groupByZone([
      table('Stol 10', '2-qavat'),
      table('Stol 2', '2-qavat'),
      table('Bar 1'),
      table('Stol 1', '1-qavat'),
      table('Bar 2', ' '),
    ]);
    expect(groups.map(({ zone }) => zone)).toEqual([
      '1-qavat',
      '2-qavat',
      null,
    ]);
    expect(names(groups[1].tables)).toEqual(['Stol 2', 'Stol 10']);
    expect(names(groups[2].tables)).toEqual(['Bar 1', 'Bar 2']);
  });
});

describe('nextTableNumber', () => {
  it('continues after the highest number with that name', () => {
    const tables = [table('Stol 2'), table('Stol 10'), table('Bar 40')];
    expect(nextTableNumber(tables, 'Stol')).toBe(11);
    expect(nextTableNumber(tables, ' stol ')).toBe(11);
    expect(nextTableNumber(tables, 'Bar')).toBe(41);
    expect(nextTableNumber(tables, 'Ayvon')).toBe(1);
    expect(nextTableNumber([], 'Stol')).toBe(1);
  });
});
