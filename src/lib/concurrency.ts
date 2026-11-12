/**
 * Bounded-concurrency `map`, keeping result order.
 *
 * Used where a provider must fan out over sub-resources it can only fetch one at
 * a time (TMDB seasons). Pure and dependency-free so the ordering and the limit
 * are testable without touching a network.
 */
export async function mapWithConcurrency<T, R>(
  input: readonly T[],
  limit: number,
  fn: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (input.length === 0) return [];
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, input.length));
  const results = new Array<R>(input.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= input.length) return;
      results[index] = await fn(input[index], index);
    }
  };

  await Promise.all(Array.from({ length: width }, worker));
  return results;
}
