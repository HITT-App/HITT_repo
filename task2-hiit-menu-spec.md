# Task 2: Restore the HIIT menu drawer

**Type:** Structural — rebuilds an app-navigation surface that was deleted in T2 Build B
**Files affected:**
- `src/components/HIITMenu.tsx` (new — trimmed reincarnation of the old FullNavMenu)
- `src/components/AppLayout.tsx` (wire up the menu state and open handler)
- `src/components/BottomNav.tsx` (centre button opens the HIIT menu, not the QuickAddSheet)
**Reference files (read-only inputs for context):**
- The deleted `src/components/FullNavMenu.tsx` from commit `8519153^` — read via git to see the original structure
- The current `src/components/QuickAddSheet.tsx` for the existing quick-add behaviour (which we're NOT touching in this task)
**Estimated effort:** 2–4 hours including TestFlight test
**Part of:** v1.0 nav restructure (Tasks 2, 3, 4 together redefine the bottom nav)

---

## Why

The HIIT centre-button used to open a full app-navigation drawer (FullNavMenu.tsx). T2 Build B deleted it and replaced the button with a QuickAddSheet (4 quick-log actions only). The owner wants the drawer back — it gave one-tap access to every major area of the app.

This task rebuilds the drawer as a **trimmed reincarnation** of the original. Items that conflict with the v1.0 product direction (workouts, challenges, resources/courses/shorts) are omitted. Everything else is included.

This task ONLY restores the menu. The bottom-nav structure (positions of Quick Add, HIIT centre button, etc.) is altered in **Task 4** — keep this task narrowly scoped.

---

## Inputs from previous work

The agreed v1.0 HIIT menu contents (decided in the owner meeting on 22 May):

**Always at the top:**
- "Choose a Sport" — primary branded action. Opens ChooseSportSheet (already built, separate component).

**Section "Main":**
- Home
- HIIT AI Coach
- Search
- Notifications

**Section "Fitness":**
- Schedule
- Activity
- Goals
- History

*(Workouts and Workout Library — explicitly removed from this menu.)*

**Section "Nutrition":**
- Nutrition
- Meals

**Section "Scanners":**
- Meal Scanner
- Body Scanner
- Barcode Scanner

**Section "Health":**
- Heart Rate
- Steps
- Weight
- Hydration
- Sleep
- Mood

**Section "Community":**
- Community
- Achievements
- Leaderboard

*(Challenges — explicitly removed; not built for v1.0.)*

*(Resources / Courses / Shorts — entire section omitted; stubs only.)*

**Section "Account":**
- Profile
- Subscription
- Settings

**Section "Admin" (admin users only):**
- Admin Dashboard

**Bottom of menu:** Sign Out

**Header of menu:** avatar + display name + email + light/dark mode toggle + close button

---

## Step 1 — Read the original

Before writing any code, view the pre-deletion `FullNavMenu.tsx`:

```bash
git show 8519153^:src/components/FullNavMenu.tsx
```

This is your reference for:
- The exact route paths used by each menu item
- The icons used per item
- The section header styling
- The header (avatar + name + email + dark mode toggle + close)
- Whether items were feature-flag gated (some were — e.g. HIIT AI Coach)

Match the original styling, structure, and route paths as closely as possible. The user's mental model is "we're bringing this back" — it should look familiar to anyone who used the app before T2 Build B.

If the original used feature flags for any item (e.g. `useFeatureFlag('hiit-ai-coach')`), preserve that gating in the new menu — feature flags are part of how the app's release machinery works.

---

## Step 2 — Build the new HIITMenu.tsx component

Create `src/components/HIITMenu.tsx`. Use the existing Sheet primitive from `@/components/ui/sheet` (the same one QuickAddSheet uses, for visual consistency).

Recommended structure:

```tsx
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
// ...other imports as needed (icons from lucide-react, user hook, theme hook)

type HIITMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HIITMenu({ open, onOpenChange }: HIITMenuProps) {
  const navigate = useNavigate();
  
  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        {/* Header: avatar + name + email + theme toggle + close */}
        <MenuHeader onClose={() => onOpenChange(false)} />

        {/* Primary action — "Choose a Sport" */}
        <ChooseSportButton onClick={() => /* see Task 3 — leave as a no-op stub for now */} />

        {/* Sections */}
        <MenuSection title="Main">
          <MenuItem icon={...} label="Home" onClick={() => go('/')} />
          {/* ... */}
        </MenuSection>

        {/* ... other sections ... */}

        {/* Admin section — only if user has admin role */}
        {isAdmin && (
          <MenuSection title="Admin">
            <MenuItem icon={...} label="Admin Dashboard" onClick={() => go('/admin')} />
          </MenuSection>
        )}

        {/* Sign out */}
        <SignOutButton />
      </SheetContent>
    </Sheet>
  );
}
```

The exact structure can mirror the original — extract whatever sub-components (MenuHeader, MenuSection, MenuItem) make sense based on the original's pattern.

### Important: "Choose a Sport" primary action

For this task, the "Choose a Sport" button **must exist** in the menu, styled prominently as a primary action (matching the original's emphasis). But its onClick handler should be a **no-op stub** that just closes the menu, or shows a toast like "Coming next". The actual wiring to ChooseSportSheet happens in Task 3.

Leave a clearly-labelled comment so this is obvious:

```tsx
// TODO Task 3: wire this to open ChooseSportSheet
const handleChooseSport = () => {
  onOpenChange(false);
  toast.info("Sport picker coming next");
};
```

This keeps Task 2 narrowly scoped and lets Task 3 stand alone.

### Routes that need to exist

Each menu item navigates to a route. Most exist already (Heart Rate, Steps, etc., per the earlier diagnostic). For any item whose route doesn't currently exist in App.tsx, **flag it in your response but do not add the route in this task** — that's separate work.

Best-known routes (from earlier diagnostic):

| Item | Route |
|---|---|
| Home | `/` |
| HIIT AI Coach | `/ai-coach` (verify feature flag still applies) |
| Search | check original |
| Notifications | check original |
| Schedule | check original |
| Activity | `/activity-dashboard` |
| Goals | `/activity-goals` |
| History | `/activity-history` |
| Nutrition | check original |
| Meals | check original |
| Meal Scanner | check original |
| Body Scanner | check original |
| Barcode Scanner | check original |
| Heart Rate | check original |
| Steps | check original |
| Weight | check original |
| Hydration | check original |
| Sleep | `/sleep` (has sub-routes too) |
| Mood | check original |
| Community | check original |
| Achievements | `/achievements` |
| Leaderboard | `/leaderboard` |
| Profile | check original |
| Subscription | check original |
| Settings | check original |
| Admin Dashboard | `/admin` |

Use the route values from the original FullNavMenu (Step 1) as the source of truth — don't guess.

---

## Step 3 — Wire up the centre button

In `src/components/BottomNav.tsx` (and any parent that supplies handlers, likely `AppLayout.tsx`):

The centre HIIT button currently opens `QuickAddSheet`. Change it to open `HIITMenu`. **Do not** remove or modify `QuickAddSheet` itself — it stays as a component, it just isn't called from this button any more. Task 4 reuses QuickAddSheet for the new Quick Add tab position.

Add state for the HIIT menu's open/closed state in whichever parent component currently holds the QuickAddSheet state. Pattern:

```tsx
const [hiitMenuOpen, setHiitMenuOpen] = useState(false);

// pass to BottomNav:
<BottomNav 
  onHIITClick={() => setHiitMenuOpen(true)} 
  // ... other handlers
/>

// render the menu:
<HIITMenu open={hiitMenuOpen} onOpenChange={setHiitMenuOpen} />
```

If the existing BottomNav uses a prop name like `onAddClick` or `onCenterClick`, you can rename it to `onHIITClick` for clarity — or leave the prop name and just change what it does. Pick whichever creates a smaller diff.

---

## Step 4 — Verify on TestFlight

After build, on a real iPhone:

1. Tap the centre HIIT button on the bottom nav. The HIIT menu drawer should open from the bottom.
2. Scroll through all sections. Confirm:
   - Header shows avatar, name, email, theme toggle, close button
   - "Choose a Sport" is prominent at the top (and shows the placeholder toast on tap)
   - All section headers render
   - All menu items render with icons
   - Admin section appears only for admin users (test by signing in as an admin if possible — or flag this for separate verification)
3. Tap each menu item in turn. Confirm:
   - The drawer closes
   - The correct destination loads
   - Use the browser/back to return after each test
4. Tap Sign Out. Confirm logout flow still works.
5. Toggle light/dark mode from the header. Confirm theme switches as expected.
6. Tap close (or swipe down). Confirm the drawer closes cleanly.

If any menu item navigates somewhere unexpected (e.g. a 404 or a broken page), don't try to fix it in this task — flag it in your response.

---

## Acceptance criteria

1. New file `src/components/HIITMenu.tsx` exists and exports a `HIITMenu` component.
2. The centre HIIT button on the bottom nav opens this menu.
3. QuickAddSheet is still in the codebase (not deleted, not modified).
4. The menu shows all sections and items listed above.
5. "Choose a Sport" exists as a prominent primary action but is a stub (no real handler yet — Task 3).
6. Workouts, Workout Library, Challenges, Resources, Courses, Shorts are NOT in the menu.
7. Admin section is gated by admin role check.
8. Sign Out works.
9. Theme toggle in the header works.
10. No TypeScript errors. No console warnings.
11. Tested on real iPhone via TestFlight.

---

## What to report back

When done, the response should confirm:

1. Which existing routes were found vs which menu items don't currently have a working route (so we know what to fix in follow-up).
2. Which menu items did you find with feature-flag gating in the original, and did you preserve it?
3. Did you successfully read the pre-deletion FullNavMenu.tsx via git? If git history isn't accessible for that commit, flag it — we'll find another way to surface the original.
4. Anything in the original that didn't fit the v1.0 list cleanly (e.g. items I forgot to mention) — list them, don't include them.
5. TestFlight build number.

Do not declare done without TestFlight verification.

---

## Out of scope (do not do, even if tempted)

- Wiring "Choose a Sport" to anything real (Task 3)
- Changing the BottomNav's tab positions or icons (Task 4)
- Removing the Workouts tab from BottomNav (Task 4)
- Adding new routes for menu items that don't have working routes (separate follow-up)
- Touching QuickAddSheet (it stays, used elsewhere)
- Adding analytics / telemetry on menu opens
- Rebuilding any of the destination pages
- Touching the FAB on Home (Task 5)
- Anything voice-related (deferred — VOICE_FEATURE_ENABLED is false)

If you find yourself wanting to fix something not in this task's scope, leave a TODO comment and report it in your response — don't fix it inline.

---

## Rollback

The new HIITMenu component is self-contained. To roll back:
1. Delete `src/components/HIITMenu.tsx`
2. Revert the changes to AppLayout.tsx and BottomNav.tsx (the centre button reverts to opening QuickAddSheet)

No DB changes, no migrations, no asset additions.

---

## Notes for the implementer

1. **The original FullNavMenu was 299 lines.** Don't fight to make this much shorter — that file existed for a reason. Section grouping, icons per item, the avatar header — all useful UX. Match the original's effort.
2. **If the original used a particular animation or transition** (e.g. spring-eased open, staggered section reveals), preserve it. Familiarity matters.
3. **Don't add new dependencies** — anything you need (sheets, icons, navigation) is already in the codebase. If you find yourself reaching for a new library, stop and reconsider.
4. **The "Health" section is six items long.** Make sure the menu is scrollable on smaller phones (iPhone SE) — the `h-[90vh]` + `overflow-y-auto` on SheetContent should handle this, but verify.
5. **Display name fallback** in the header: if `display_name` is null, the original menu may have fallen back to email. Match whatever the original did — don't change behaviour silently.
6. **HIIT AI Coach voice is disabled in v1.0** — the menu item still appears (linking to the text-only chat) but no voice surface. Don't add or restore any voice UI.
