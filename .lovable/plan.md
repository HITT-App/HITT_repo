

## Add Triathlon / Ironman as a Flagship Sport

### Overview
Add a dedicated **Triathlon** mode that chains three GPS-tracked disciplines (Swim → Bike → Run) into a single multi-stage activity session. This goes beyond a normal sport entry — it gets a premium featured banner in the sport picker and a custom multi-leg tracker page.

### What changes

**1. Sport config (`src/lib/sports.ts`)**
- Add `"Triathlon"` entry with a `Trophy` icon, distinctive gold color (`text-yellow-500`), combined MET of ~8.5, tracker type `"gps"`, and a new category
- Add a new category `"Endurance"` to `SPORT_CATEGORIES` containing `["Triathlon"]`
- Override `getTrackerRoute` to return a dedicated `/triathlon` route for the Triathlon key

**2. Featured banner in sport picker (`src/components/ChooseSportSheet.tsx`)**
- Add a premium "Ironman / Triathlon" banner card at the top (above Routes), styled with a gold/orange gradient, Trophy icon, and "FLAGSHIP" badge
- Clicking it navigates to `/triathlon`

**3. New Triathlon tracker page (`src/pages/Triathlon.tsx`)**
- A dedicated multi-leg activity page with 3 sequential stages: **Swim → Bike → Run**
- Each leg has its own timer, distance, and calorie tracking
- Top progress bar shows the 3 legs with the active one highlighted (swim=blue, bike=cyan, run=green)
- "Next Leg" button transitions between stages with a brief transition animation
- Uses the existing `LiveActivityMap` for GPS tracking on Bike and Run legs
- Swim leg uses timer mode (no GPS in water)
- On completion, shows `CompletionSummary` with combined totals and per-leg breakdown
- Premium dark UI with gold accent theming to feel "special"

**4. Route registration (`src/App.tsx`)**
- Add `/triathlon` route pointing to the new `Triathlon` page

**5. Route constant (`src/lib/routes.ts`)**
- Add `TRIATHLON: "/triathlon"` to `ROUTES`

### Technical details

- The Triathlon page manages an internal `leg` state (0=swim, 1=bike, 2=run) with separate elapsed/distance/calorie accumulators per leg
- GPS watch starts on leg 1 (bike), continues through leg 2 (run); leg 0 (swim) is timer-only
- Calorie calculation uses leg-specific MET values: Swim 8.0, Cycling 7.5, Run 9.8
- Completion saves a single activity log with `activity_type: "triathlon"` and combined totals
- The sport picker banner uses `backdrop-blur-xl` glass effect with gold gradient to match the app's premium aesthetic

