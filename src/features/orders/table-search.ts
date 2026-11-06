import { sortByName } from '@/shared/lib/format';

interface NamedTable {
  name: string;
  zone: string | null;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/['ʻʼ`’]/g, '')
    .trim();

/**
 * Matches name or zone. A table whose number is exactly what was typed comes first,
 * so typing 5 and pressing Enter picks "Stol 5" and not "Stol 15".
 */
export function searchTables<T extends NamedTable>(
  tables: readonly T[],
  query: string,
): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...tables];
  const haystack = (table: T) => normalize(`${table.name} ${table.zone ?? ''}`);
  const matches = tables.filter((table) =>
    words.every((word) => haystack(table).includes(word)),
  );
  const exact = (table: T) =>
    words.some((word) => normalize(table.name).split(/\s+/).includes(word));
  return [...matches.filter(exact), ...matches.filter((t) => !exact(t))];
}

/** Tables by floor or zone, in natural order; those without a zone come last. */
export function groupByZone<T extends NamedTable>(tables: readonly T[]) {
  const zones = new Map<string | null, T[]>();
  for (const table of sortByName(tables)) {
    const zone = table.zone?.trim() || null;
    zones.set(zone, [...(zones.get(zone) ?? []), table]);
  }
  const named = sortByName(
    [...zones.keys()].flatMap((name) => (name ? [{ name }] : [])),
  );
  return [
    ...named.map(({ name }) => ({ zone: name, tables: zones.get(name)! })),
    ...(zones.has(null) ? [{ zone: null, tables: zones.get(null)! }] : []),
  ];
}

/** The number after the highest "Stol N", so that a new batch continues from there. */
export function nextTableNumber(
  tables: readonly { name: string }[],
  prefix: string,
): number {
  const wanted = normalize(prefix);
  const numbers = tables.flatMap(({ name }) => {
    const match = /^(.*?)\s*(\d+)$/.exec(name.trim());
    return match && normalize(match[1]) === wanted ? [Number(match[2])] : [];
  });
  return Math.max(0, ...numbers) + 1;
}
