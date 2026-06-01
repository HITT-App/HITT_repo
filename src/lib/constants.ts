/**
 * Chat history retention window (hours).
 * Messages older than this are hidden from the user's chat view AND
 * excluded from the AI prompt context, then physically deleted on next write.
 * To extend retention: change this value AND the matching copy in
 * supabase/functions/_shared/constants.ts — keep them in sync.
 */
export const CHAT_RETENTION_HOURS = 24;

// Keep in sync with NutritionPreferencesFlow.tsx and A19 preferences editor
export const ALLERGEN_OPTIONS = [
  'Nuts', 'Peanuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Sesame',
] as const;

export const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Low-carb',
] as const;
