

## Plan: Replace Center Button Action with "Choose a Sport" Drawer

Currently, tapping the center HIIT logo opens the `FullNavMenu` (a general navigation drawer). We will replace this with a new **"Choose a Sport"** drawer inspired by the reference screenshot.

### What gets built

A new `ChooseSportSheet` component rendered as a bottom drawer with:

1. **Header**: "Choose a Sport" title with X close button
2. **Banner card**: "New Sports available!" promo card (dark card with text)
3. **"Your Top Sports" section**: Horizontal row of 4 circular icon buttons (Swim, Run, Workout, Weight Training) — uses Lucide icons mapped to sport types
4. **Categorized sport lists** (e.g. "Foot Sports", "Water Sports", "Gym"): Vertical list items with circular icons and labels — scrollable via `ScrollArea`
5. **On sport select**: Navigate to the relevant activity/workout page (e.g. `/log-activity`) and close the drawer

### Files changed

| File | Change |
|------|--------|
| `src/components/ChooseSportSheet.tsx` | **New** — the full "Choose a Sport" drawer component |
| `src/pages/Index.tsx` | Replace `FullNavMenu` with `ChooseSportSheet` for the center button |

### Sport categories & icons

- **Top Sports** (horizontal circles): Swim (`Waves`), Run (`Footprints`), Workout (`Activity`), Weight Training (`Dumbbell`)
- **Foot Sports**: Run, Trail Run, Walk, Hike
- **Water Sports**: Swim, Surf
- **Gym**: Weight Training, HIIT, Yoga, Cycling

Each sport click navigates to `/log-activity?sport=<name>` (or a relevant existing route) and closes the sheet.

### Design

- Dark themed drawer matching app style (`bg-background`, `text-foreground`)
- Circular icon containers with `bg-muted` backgrounds
- Section headers in bold
- Banner card with subtle border and darker background

