-- Find meals that don't have images associated.
-- Paste any/all of these into the Supabase Studio SQL editor.

-- ============================================================
-- 1. Headline counts: with vs without image
-- ============================================================
SELECT
  COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS without_image,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url <> '') AS with_image,
  COUNT(*) AS total
FROM public.meals;


-- ============================================================
-- 2. Per-category breakdown
-- ============================================================
SELECT
  category,
  COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS without_image,
  COUNT(*)                                                    AS total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '')
    / NULLIF(COUNT(*), 0),
    1
  ) AS pct_missing
FROM public.meals
GROUP BY category
ORDER BY without_image DESC, category;


-- ============================================================
-- 3. The actual list of meals missing an image
-- ============================================================
SELECT
  id,
  name,
  category,
  cuisine_type,
  is_featured,
  created_at
FROM public.meals
WHERE image_url IS NULL OR image_url = ''
ORDER BY is_featured DESC, category, name;


-- ============================================================
-- 4. Optional — export-ready CSV of the same list
--    (Studio: click "Download as CSV" after running)
-- ============================================================
SELECT
  id::text       AS id,
  name,
  category,
  COALESCE(cuisine_type, '') AS cuisine_type,
  COALESCE(description, '')  AS description
FROM public.meals
WHERE image_url IS NULL OR image_url = ''
ORDER BY category, name;
