/** Gives items the positions 0, 1, 2... and returns only those whose position changed. */
export function changedPositions<T extends { id: string; sortOrder: number }>(
  items: readonly T[],
): { id: string; sortOrder: number }[] {
  return items.flatMap((item, sortOrder) =>
    item.sortOrder === sortOrder ? [] : [{ id: item.id, sortOrder }],
  );
}

/** New items go last. */
export const nextSortOrder = (items: readonly { sortOrder: number }[]) =>
  items.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0);
