/**
 * Round-robin merge of one result list per item type.
 *
 * Jellyfin orders a mixed `Movie,Series` query by item type before paging, so the
 * first 20 rows of a library with 965 films and 60 shows are always films — a
 * mixed deck never surfaces a show. Asking once per type and interleaving here is
 * what makes the page actually mixed.
 */
export function interleaveByKind<T>(lists: readonly (readonly T[])[], limit?: number): T[] {
  const merged: T[] = [];
  const longest = lists.reduce((max, list) => Math.max(max, list.length), 0);
  for (let index = 0; index < longest; index += 1) {
    for (const list of lists) {
      if (index < list.length) merged.push(list[index]);
      if (limit !== undefined && merged.length >= limit) return merged;
    }
  }
  return merged;
}

/**
 * Per-type paging for a split request: `limit` cards per page are shared evenly,
 * and the offset is divided the same way so consecutive pages neither overlap nor
 * skip. `Math.ceil` keeps the last card of an odd page size.
 */
export function splitPaging(limit: number, offset: number, typeCount: number): { limit: number; offset: number } {
  const count = Math.max(1, typeCount);
  return {
    limit: Math.ceil(limit / count),
    offset: Math.floor(offset / count),
  };
}
