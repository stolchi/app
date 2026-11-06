import { changedPositions, nextSortOrder } from './reorder';

describe('reordering', () => {
  it('saves only what moved', () => {
    expect(
      changedPositions([
        { id: 'a', sortOrder: 0 },
        { id: 'c', sortOrder: 2 },
        { id: 'b', sortOrder: 1 },
      ]),
    ).toEqual([
      { id: 'c', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ]);
  });

  it('gives every item its own position when all share the default', () => {
    expect(
      changedPositions([
        { id: 'a', sortOrder: 0 },
        { id: 'b', sortOrder: 0 },
        { id: 'c', sortOrder: 0 },
      ]),
    ).toEqual([
      { id: 'b', sortOrder: 1 },
      { id: 'c', sortOrder: 2 },
    ]);
  });

  it('puts new items last', () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([{ sortOrder: 4 }, { sortOrder: 1 }])).toBe(5);
  });
});
