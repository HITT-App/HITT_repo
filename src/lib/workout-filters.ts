/**
 * Normalises a string to canonical kebab-case slug form.
 * Used in WorkoutLibrary filter comparisons so today's mixed-case DB data
 * still matches the canonical slug IDs in the filter constants.
 *
 * Examples:
 *   "Strength"      -> "strength"
 *   "HIIT"          -> "hiit"
 *   "Full body"     -> "full-body"
 *   "Cardio system" -> "cardio-system"
 *   "  Warm-up  "   -> "warm-up"
 *   null            -> ""
 */
export function normaliseSlug(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}
