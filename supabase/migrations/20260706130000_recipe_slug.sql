-- Give recipes a stable, human-meaningful slug so the meal library can be
-- maintained incrementally instead of regenerated as a batch:
--   • new sections  → plain INSERTs (slug auto-fills from the name)
--   • edit one meal  → UPDATE ... WHERE slug = 'peri-peri-egg-whites-...'
--   • remove one     → DELETE FROM public.recipes WHERE slug = '...'  (cascades)
--
-- Until now a recipe's only identity was a random UUID, which is why the old
-- importer leaned on delete-all-then-reinsert. A slug + unique index gives us a
-- key to target single rows and to make future seeds safely re-runnable.
--
-- See CLAUDE.md → "Recipe library maintenance" for the full workflow.

BEGIN;

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing rows: slugify(name), disambiguating the few duplicate names
-- with a numeric suffix. Deterministic ordering (by id) so re-running is stable.
WITH slugified AS (
  SELECT
    id,
    COALESCE(
      NULLIF(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''),
      'recipe'
    ) AS base
  FROM public.recipes
  WHERE slug IS NULL
),
ranked AS (
  SELECT id, base,
         row_number() OVER (PARTITION BY base ORDER BY id) AS rn
  FROM slugified
)
UPDATE public.recipes r
SET slug = CASE WHEN ranked.rn = 1 THEN ranked.base ELSE ranked.base || '-' || ranked.rn END
FROM ranked
WHERE r.id = ranked.id;

-- Enforce uniqueness + presence from here on.
CREATE UNIQUE INDEX IF NOT EXISTS recipes_slug_key ON public.recipes (slug);
ALTER TABLE public.recipes ALTER COLUMN slug SET NOT NULL;

-- Auto-fill slug from name on INSERT when none is supplied, so new seeds can
-- stay plain INSERTs. Collisions get a numeric suffix. Slugs are intentionally
-- stable: we do NOT regenerate on UPDATE, so renaming a meal never breaks a
-- reference. Set slug explicitly in the UPDATE if you want it to track a rename.
CREATE OR REPLACE FUNCTION public.recipes_set_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  base      text;
  candidate text;
  n         int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := COALESCE(
    NULLIF(trim(both '-' from regexp_replace(lower(COALESCE(NEW.name, '')), '[^a-z0-9]+', '-', 'g')), ''),
    'recipe'
  );
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.recipes WHERE slug = candidate) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS recipes_set_slug ON public.recipes;
CREATE TRIGGER recipes_set_slug
  BEFORE INSERT ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.recipes_set_slug();

COMMIT;
