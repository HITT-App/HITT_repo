# Task 2.1: HIITMenu Drawer fix

**Type:** Small structural correction to Task 2
**Files affected:** `src/components/HIITMenu.tsx`
**Estimated effort:** 15–30 minutes
**Why:** Task 2 used Sheet (which lacks swipe-to-close), but the original FullNavMenu used Drawer for a reason. Drawer wraps vaul (already a dependency) and provides native swipe-down-to-dismiss, drag handle, velocity detection. The Drawer component is the right primitive for a tall scrolling app-navigation panel.

---

## Change

In `src/components/HIITMenu.tsx`:

**Replace:**
```tsx
import { Sheet, SheetContent } from "@/components/ui/sheet";

<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="bottom" className="...">
    {/* ...menu content... */}
  </SheetContent>
</Sheet>
```

**With:**
```tsx
import { Drawer, DrawerContent } from "@/components/ui/drawer";

<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerContent className="...">
    {/* ...menu content unchanged... */}
  </DrawerContent>
</Drawer>
```

The internal content (header, sections, items, sign out) stays exactly the same. Only the wrapper changes.

If the existing `<SheetContent>` has a `side="bottom"` prop, the equivalent in Drawer is the default — Drawer opens from the bottom by default, no prop needed.

If the existing height/overflow utility classes (`h-[90vh] overflow-y-auto` or similar) are needed, keep them on `<DrawerContent>`.

---

## What you get for free

- Swipe-down-to-dismiss anywhere in the drawer
- Drag-handle visual indicator at the top (the small horizontal pill — iOS users recognise this as "swipeable bottom panel")
- Rubber-band overdrag if user drags up beyond the top
- Velocity-aware close — a fast flick down dismisses even at small distance

These match how the original FullNavMenu felt before T2 Build B deleted it.

---

## Acceptance criteria

1. The HIIT menu drawer opens from the bottom on tap of centre HIIT button (unchanged).
2. Swiping down anywhere in the drawer dismisses it.
3. The drag-handle indicator is visible at the top of the drawer.
4. Overlay-tap still dismisses (existing behaviour).
5. All menu items still work — sections, navigation, Sign Out, theme toggle, header.
6. No TypeScript errors.
7. Tested on real iPhone via TestFlight (swipe needs real hardware to test).

---

## Out of scope (do not do)

- Anything else in HIITMenu beyond the wrapper swap
- The Health section feature-flag fix (Vanessa runs SQL directly — not a code change)
- The AI surface unification question (waiting on owner decision)
- The Settings page question (waiting on diagnostic + owner decision)

---

## Notes

This is the kind of small correction we want as one-shot, low-friction work. Don't elaborate. Don't refactor. Two-line import change, four-line wrapper change. Build, test, ship.
