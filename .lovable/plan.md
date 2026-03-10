

# Admin Home Layout Manager

Add a new "Layout" admin page where admins can visually enable/disable home page sections and drag-and-drop to reorder them. The home page (`Index.tsx`) will then render sections dynamically based on this saved order.

## Database

Create a `home_layout` table to store section order and visibility:

```sql
CREATE TABLE public.home_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  label text NOT NULL,
  enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.home_layout ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for home page rendering)
CREATE POLICY "Anyone can read home layout" ON public.home_layout FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "Admins can update home layout" ON public.home_layout FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed with current sections
INSERT INTO public.home_layout (section_key, label, sort_order, enabled) VALUES
  ('hero', 'Hero Banner', 0, true),
  ('header', 'Header & Score', 1, true),
  ('stats_grid', 'Stats Grid', 2, true),
  ('fitness_metrics', 'Fitness Metrics', 3, true),
  ('activity', 'Activity', 4, true),
  ('workouts', 'Workouts', 5, true),
  ('coaching', 'Coach Session', 6, true),
  ('nutrition', 'Nutrition', 7, true),
  ('sleep', 'Sleep', 8, true),
  ('ai_coach', 'AI Coach', 9, true),
  ('resources', 'Resources', 10, true);
```

## New Files

### `src/hooks/useHomeLayout.ts`
- Fetch `home_layout` ordered by `sort_order`
- Return `{ sections, loading }` — each section has `section_key`, `enabled`, `sort_order`

### `src/pages/admin/AdminLayout.tsx` (new admin page)
- List all sections as draggable cards with toggle switches
- Use simple pointer-event-based drag-and-drop (no external library needed — use `onDragStart`/`onDragOver`/`onDrop` with HTML5 drag API)
- Each card shows: drag handle icon, section label, enable/disable switch
- Save button updates `sort_order` and `enabled` for all rows in one batch

## Modified Files

### `src/pages/Index.tsx`
- Import `useHomeLayout` hook
- Build a section map: `{ hero: <HomeHero />, workouts: <WorkoutsSection />, ... }`
- Render sections by iterating the sorted layout array, checking both `enabled` from layout AND the corresponding feature flag

### `src/components/admin/AdminSidebar.tsx`
- Add "Layout" nav item pointing to `/admin/layout`

### `src/App.tsx`
- Add route: `/admin/layout` → `AdminRoute` wrapping the new layout page

## UX Design
- Each section is a horizontal card with: `☰` drag handle | Section label | `Switch` toggle
- Dragging reorders; switches toggle visibility
- "Save Layout" button at top persists changes
- "Reset to Default" button restores original order
- Changes reflect immediately on the home page for all users

