/** Minimal class joiner. Deliberately not clsx+tailwind-merge: nothing here
 *  needs conflict resolution yet, and a 2-line helper beats two dependencies. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
