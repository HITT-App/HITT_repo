# T2.5 — Nav Restructure + Floating "+" + Schedule Card on Home

## What this does

Restructures the bottom navigation around the four most-used destinations (Workouts and Nutrition replacing "+" and Schedule), moves the "+" to a floating action button, and adds a "Next up" Schedule card to the Home dashboard so Schedule remains visible from Home even though it's no longer a bottom-nav tab.

This builds on Build A and Build B of the nav cleanup — it changes the bottom nav structure decided in those builds. After T2.5, the existing Build A wiring (avatar → Profile, Body Scan card) and Build B wiring (QuickAddSheet, QuickWorkoutPicker, mega-menu deletion) all remain valid. Only the bottom nav structure and "+" trigger change.

## Naming convention used throughout

User-facing text in this spec refers to the AI coach as **"HIIT AI Coach"**. Internal code identifiers continue to use `Jarvis` (e.g. `JarvisMode.tsx`, `triggerJarvisGoals`). Don't rename internal code as part of this task — but any new user-facing string must use "HIIT AI Coach".

---

## The end state

### Bottom navigation (5 slots)

| Position | Tab | Route | Icon |
|----------|-----|-------|------|
| 1 | Home | `/` | `Home` |
| 2 | Workouts | `/workout-library` | `Dumbbell` or `Flame` |
| 3 | [HIIT centre — opens Jarvis] | (existing behaviour, unchanged) | HIIT logo |
| 4 | Nutrition | (confirm route — likely `/nutrition` or `/nutrition-dashboard`) | `Apple` or `UtensilsCrossed` |
| 5 | Social | `/community` (existing route) | `MessageCircle` (existing) |

**What's removed from the bottom nav:**
- "+" (moves to a floating action button)
- "Schedule" (moves to a card on Home — this reverses the You→Schedule swap from Build A)

**What's unchanged:**
- The HIIT centre button (brand moment, still opens Jarvis)
- The "Social" tab in position 5 (existing)
- The Home top-bar (avatar, search, bell — wired in Build A)

### Floating "+" button

A circular orange button (~56px) positioned in the bottom-right of the content area, floating above the bottom nav.

**Behaviour:**
- Visible on: Home, Workouts, Nutrition, Schedule screen (when accessed via card tap)
- Hidden on: Jarvis chat screen, active workout player, onboarding/auth screens
- On tap: opens the existing `QuickAddSheet` component (built in Build B)
- Position: `fixed bottom-20 right-4 z-40` (or whatever your bottom-nav height + comfortable padding works out to)

**Implementation:**
- New component: `src/components/FloatingActionButton.tsx`
- Rendered from `AppLayout.tsx` (the same layout that owns the QuickAddSheet state)
- Uses `useLocation()` from `react-router-dom` to determine visibility based on current route

### Schedule card on Home

A new card added to the Home dashboard's scrollable content. Three visual states based on the user's scheduled workouts.

**State A — Has 2-3+ upcoming scheduled workouts:**
- Card title: "Next up"
- Shows the next 2-3 scheduled items, each with:
  - Day label (Today / Tomorrow / day name like "Friday")
  - Time (e.g. "9:00 AM")
  - Workout title
- "View all →" link to `/workout-schedule`
- Each item is tappable, navigates to the workout detail screen

**State B — Has exactly 1 upcoming scheduled workout:**
- Same layout but with just the one item
- Encourages the user to plan more: small text below: "Plan the rest of your week" with tap-through to Schedule

**State C — Empty (no upcoming workouts):**
- Heading: "No activities scheduled"
- Body text: "Let HIIT AI Coach build you a plan"
- CTA button: "Build my plan →"
- Tapping the CTA opens Jarvis with the goals onboarding flow active (same mechanism as the home-screen "Build a personalised training plan" card — see T5 for the goals flow spec; for now, just dispatch an event or set state that triggers the goals questionnaire)

**Placement on Home:**
Between the stats grid and the workouts carousel, in the same area as the Body Scan card from Build A. Order: stats grid → Body Scan card → Schedule card → workouts carousel → nutrition section → HIIT AI Coach card.

## Implementation order

Two builds. Ship in this order.

### Build A — bottom nav restructure + floating "+"

**Goal:** the bottom nav matches the new structure, "+" is a floating button, Schedule is removed from the nav. After this build, Schedule is reachable only via the "View" button on... wait, that doesn't exist yet. So the order matters. Actually, the safer order is to ship the Schedule card *first* (Build B becomes Build A here), then remove Schedule from the nav. Otherwise there's a window where Schedule is hard to reach.

**Reordered: Build A is the Schedule card on Home, Build B is the bottom nav restructure.**

### Build A — Schedule card on Home

This must ship first. Once it's live, Schedule is reachable from Home, and the bottom-nav slot can be safely repurposed.

**Steps:**

1. Create new component `src/components/home/ScheduleCard.tsx`.
2. The component queries `scheduled_workouts` for the current user, filtered to `scheduled_date >= today`, ordered by date ascending, limit 3.
3. Determine state:
   - 0 results → State C (empty)
   - 1 result → State B (single item with "plan more" prompt)
   - 2-3 results → State A (full card)
4. Render appropriate state.
5. In `Index.tsx` (or whichever file renders Home), add `ScheduleCard` to the section list and to the `flatMap` injection logic alongside the existing `BodyScanCard`. Position: after Body Scan card, before workouts carousel.
6. Add `ScheduleCard` to the exports in `src/components/home/index.ts`.

**For the empty state CTA ("Build my plan →"):**
- The intended behaviour is to open Jarvis with the goals onboarding flow active
- For now, the simplest implementation is to dispatch a custom event (e.g. `window.dispatchEvent(new CustomEvent('hiit:open-jarvis-goals'))`) that `VoiceController` listens for and opens Jarvis with the goals flow
- If that wiring doesn't exist yet, fall back to navigating to `/` and showing the existing "Build a personalised training plan" home-screen card as the user's next step

**Testing:**
- New user (no scheduled workouts) → see State C with empty message and CTA
- User with 1 scheduled workout → see State B
- User with 3+ scheduled workouts → see State A with the next 3 items
- Tapping any of the 2-3 items navigates to the workout detail
- Tapping "View all" navigates to `/workout-schedule`
- Tapping the empty state CTA opens Jarvis (or falls back as described)

### Build B — bottom nav restructure + floating "+"

After Build A is shipped and tested, restructure the bottom nav.

**Steps:**

1. **Confirm the Nutrition route.** Open the router and find where the Nutrition Dashboard lives. Note the exact path. If unsure, search for "NutritionDashboard" in the codebase and trace the route. Don't proceed until confirmed.

2. **Update `BottomNav.tsx`:**
   - Remove the "+" tab entry
   - Remove the "Schedule" tab entry (added in Build A — yes we're reversing this)
   - Add "Workouts" tab → `/workout-library`, icon `Dumbbell` or `Flame` (pick the one that visually fits)
   - Add "Nutrition" tab → confirmed route from step 1, icon `Apple` or `UtensilsCrossed`
   - Keep the centre HIIT button exactly as it is
   - Keep the "Social" tab as it is
   - Order: Home / Workouts / [HIIT centre] / Nutrition / Social
   - Update the `onAddClick` prop interface — `BottomNav` no longer receives or uses it (the "+" is moved to a floating button, not in the nav)

3. **Create `src/components/FloatingActionButton.tsx`:**

```tsx
import { useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

// Routes where the FAB should be hidden.
const HIDDEN_ROUTES = [
  '/coach',        // Jarvis chat (confirm actual route)
  '/workout/',     // Active workout player — prefix match
  '/auth',         // Auth screens — prefix match
  '/onboarding',   // Onboarding flow — prefix match
];

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const { pathname } = useLocation();

  const shouldHide = HIDDEN_ROUTES.some(route =>
    route.endsWith('/') ? pathname.startsWith(route) : pathname === route
  );

  if (shouldHide) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Quick add"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
```

Confirm the actual Jarvis route before applying — `/coach` is a guess. If Jarvis lives at a different path, use that.

4. **Update `AppLayout.tsx`:**
   - Remove the `onAddClick` prop passed to `BottomNav`
   - Render `<FloatingActionButton onClick={() => setQuickAddOpen(true)} />` alongside the existing `<QuickAddSheet>`
   - The `quickAddOpen` state stays as-is — the FAB just triggers the same sheet

5. **Verify all destinations are still reachable after the change:**
   - Schedule → Home Schedule card (Build A) → tap-through to `/workout-schedule`
   - "+" actions → floating button → QuickAddSheet
   - Workouts → bottom nav direct → `/workout-library`
   - Nutrition → bottom nav direct → confirmed route
   - Everything else unchanged from Build B of the original nav cleanup

**Testing:**
- Bottom nav shows: Home / Workouts / [HIIT] / Nutrition / Social
- Schedule tab is no longer in the nav
- "+" tab is no longer in the nav
- Floating "+" button visible on Home, Workouts, Nutrition, Social
- Floating "+" hidden when Jarvis chat is open
- Floating "+" hidden during an active workout
- Tap floating "+" → QuickAddSheet opens
- Schedule reachable via the Home card (Build A)
- All other destinations from Build B's verification still load

## What this does NOT change

- The HIIT centre button (still opens Jarvis, unchanged)
- The avatar → Profile wiring (Build A, unchanged)
- The Body Scan card on Home (Build A, unchanged)
- The QuickAddSheet contents (Build B, unchanged — the FAB just triggers the same sheet)
- The QuickWorkoutPicker (Build B, unchanged)
- Any of the contextual scanner placement work from the original nav cleanup Build C (still pending)
- Jarvis behaviour, the workout player, the share flow, or anything outside nav and Home

## Risks and watch-outs

1. **The order matters.** Schedule must be reachable via the Home card *before* it's removed from the bottom nav, or there's a window where Schedule is hard to find. Ship the Schedule card first, test it, then remove Schedule from the nav.

2. **Reversing the Build A You→Schedule swap.** This is mildly confusing in commit history — Build A added Schedule to the nav, T2.5 Build B removes it. That's fine, but make sure the diff is clean (Schedule is *removed* from the nav array, not left there as dead code).

3. **The Nutrition route is unconfirmed.** Don't ship Build B without knowing the exact path. If it doesn't exist as a dedicated route, that's a different problem — you'd need to either add the route or rethink whether Nutrition deserves a bottom-nav tab.

4. **The FAB position may clash with iOS UI on some phones.** `fixed bottom-20 right-4` works on most iPhones but check on a real device with a home indicator and a tall content area. Adjust if it overlaps the indicator or sits awkwardly behind the nav.

5. **The empty-state CTA on the Schedule card** ("Build my plan") needs the goals flow to work properly. If the goals flow (T5) isn't built yet, the CTA's fallback is just "navigate to Home and show the existing build-plan card", which is a soft landing rather than a hard error.

6. **The `scheduled_workouts` query may have edge cases** — timezones, "today" definition, what counts as "upcoming". Use local timezone date strings (same approach as the A3 schedule bug fix in `loop-1-fixes.md`).

## Test plan I'll run after Build A deploys

1. Open Home → Schedule card visible
2. New account (no scheduled workouts) → State C with "No activities scheduled — let HIIT AI Coach build you a plan"
3. Add 1 scheduled workout → reload Home → State B
4. Add 2 more → reload Home → State A with three items
5. Tap a scheduled item → workout detail opens
6. Tap "View all" → `/workout-schedule` opens
7. Empty-state CTA tap → opens Jarvis (or fallback as designed)

## Test plan I'll run after Build B deploys

1. Bottom nav: Home / Workouts / [HIIT] / Nutrition / Social
2. Tap Workouts → workout library
3. Tap Nutrition → nutrition dashboard
4. Floating "+" visible bottom-right on Home
5. Tap floating "+" → QuickAddSheet opens
6. Open Jarvis → floating "+" hidden
7. Start a workout → floating "+" hidden during the workout
8. Close workout → floating "+" reappears
9. Schedule no longer in bottom nav but reachable via Home card

## Deploy

Two builds, in order:
```bash
# Build A — Schedule card
git add src/components/home/ScheduleCard.tsx src/components/home/index.ts src/pages/Index.tsx
git commit -m "T2.5 Build A: Schedule card on Home with three states"
~/bin/deploy-ios.sh hitt

# After test passes:

# Build B — nav restructure + floating "+"
git add src/components/BottomNav.tsx src/components/FloatingActionButton.tsx src/AppLayout.tsx
git commit -m "T2.5 Build B: nav restructure + floating + button"
~/bin/deploy-ios.sh hitt
```
