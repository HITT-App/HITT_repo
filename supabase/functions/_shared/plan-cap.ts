// The model sometimes returns one session too many, or one past the end of the plan.
// Keeps the earliest sessions up to the number asked for, in date order.
export function capSessions<T>(items: T[], max: number, order: (item: T) => number | string): T[] {
  return [...items]
    .sort((a, b) => {
      const x = order(a);
      const y = order(b);
      return x < y ? -1 : x > y ? 1 : 0;
    })
    .slice(0, Math.max(0, max));
}
