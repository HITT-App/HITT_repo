/**
 * Source-data corrections for the seeded recipes (task #115).
 *
 * The recipe generator applied one 40–250 g scale to every "carb component" regardless
 * of what the food was. For grains that's fine — those really are cooked weights. For
 * bread and tortilla wraps it isn't: it produced lines like
 *
 *     "250g wholegrain bread (cooked weight)"     → six slices
 *     "220g wholewheat tortilla wrap (cooked weight)" → three or four wraps
 *
 * Bread is also never a "cooked weight" — that suffix is generator boilerplate and is
 * meaningless (and confusing) to a user reading the ingredient list.
 *
 * These corrections rewrite the ingredient line to a realistic single serving. They are
 * applied both when recomputing macros AND emitted as UPDATEs against
 * public.ingredients, so the list the user reads and the macros shown agree.
 *
 * Chosen portions (deliberately ordinary, not maximal):
 *   bread  → 80 g  = 2 medium slices
 *   wrap   → 60 g  = 1 tortilla
 */

/** Foods whose seeded amount is unreliable, with the serving to substitute. */
export const PORTION_OVERRIDE: Record<string, { grams: number; label: string }> = {
  'wholegrain bread':         { grams: 80, label: '80g wholegrain bread (2 slices)' },
  'wholemeal bread':          { grams: 80, label: '80g wholemeal bread (2 slices)' },
  'wholemeal toast':          { grams: 80, label: '80g wholemeal toast (2 slices)' },
  'rye bread':                { grams: 80, label: '80g rye bread (2 slices)' },
  'sourdough':                { grams: 80, label: '80g sourdough (2 slices)' },
  'wholewheat tortilla wrap': { grams: 60, label: '60g wholewheat tortilla wrap (1 wrap)' },
  'wholemeal wrap':           { grams: 60, label: '60g wholemeal wrap (1 wrap)' },
};

/**
 * Returns the corrected ingredient line, or null when the line is already fine.
 * Only rewrites when the stated amount actually exceeds a sane serving — a recipe
 * that already says "40g rye bread" is left alone.
 */
export function correctIngredient(
  raw: string,
  food: string | null,
  grams: number | null,
): { line: string; grams: number } | null {
  if (!food || grams == null) return null;
  const override = PORTION_OVERRIDE[food];
  if (!override) return null;
  if (grams <= override.grams) return null;
  return { line: override.label, grams: override.grams };
}
