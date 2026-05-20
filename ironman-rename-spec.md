# Spec: Ironman trademark rename

**Type:** Trademark hygiene / pre-launch compliance
**Estimated effort:** Small (≤30 min including verification)
**Blocker for:** Sports tab visual redesign

---

## Why

IRONMAN® is a registered trademark of World Triathlon Corporation. Using "Full Ironman" and "Half Ironman" as race-type labels in a commercial app is potentially infringing. Standard industry practice is to use the generic distance names: **Long Course** and **Middle Distance**.

A codebase audit identified four user-visible occurrences. This spec covers the rename.

---

## Scope

### In scope (must change)

| File | Line | Current | New |
|---|---|---|---|
| `src/pages/Triathlon.tsx` | 37 | `"Full Ironman"` (RACE_PRESETS label) | `"Long Course"` |
| `src/pages/Triathlon.tsx` | 38 | `"Half Ironman"` (RACE_PRESETS label) | `"Middle Distance"` |
| `src/pages/Triathlon.tsx` | 54 | `useState("Full Ironman")` (default) | `useState("Long Course")` |
| `src/components/ChooseSportSheet.tsx` | 81 | `"Ironman / Triathlon"` | `"Triathlon"` |

### Out of scope (do not change)

- `CHANGELOG.md` lines 134, 136, 138 — historical record
- `OWNER_DECISIONS.md` line 224 — historical record
- `docs/product-spec.md` line 11 — historical record

These are internal-only and never reach users, so trademark law doesn't apply. Leaving them as historical record is correct.

---

## Implementation notes

### 1. Watch for downstream references

The labels in `RACE_PRESETS` may be used as **keys** elsewhere — e.g. lookups, conditionals, analytics events, persisted user data. Before applying the rename, grep for:

- `"Full Ironman"` (with quotes)
- `"Half Ironman"` (with quotes)
- `Full Ironman` (no quotes, in case it appears as a key in an object literal)
- `Half Ironman`

If any non-display references exist (lookups, switch statements, saved-state matching), flag them in the response **before applying changes**. Renaming a display label is safe; renaming an identifier that's also used as a lookup key will break things.

If `RACE_PRESETS` items have a separate `id` or `value` field distinct from the display label, only the display label should change — the underlying ID can stay as-is to preserve any persisted state. Inspect the array shape and report back what you find.

### 2. Sprint and Olympic consistency check

The audit only flagged "Ironman" terms. If the race picker also has "Sprint" and "Olympic" entries (untrademarked, no change needed), confirm the four-option list still reads consistently after the rename — e.g.:

- Sprint
- Olympic
- Middle Distance
- Long Course

If the list reads oddly (e.g. mixing branded and unbranded conventions), flag it but don't change Sprint/Olympic without explicit instruction.

### 3. Default state

`useState("Full Ironman")` on line 54 must change to match whatever the new default label is — `"Long Course"`. If the default is derived from `RACE_PRESETS[0]` rather than hardcoded, no change needed beyond the array update.

### 4. ChooseSportSheet.tsx

This component is currently orphaned (no nav entry point since FullNavMenu was deleted in T2 Build B). The rename is still required as a precaution — if the screen is rewired later, we don't want trademark-risky strings reappearing.

---

## Acceptance criteria

1. All four user-visible occurrences renamed as per the table above.
2. No new TypeScript errors introduced.
3. App builds and runs.
4. Triathlon screen (`/triathlon`) loads with "Long Course" selected by default.
5. Race picker shows the new labels.
6. Any downstream references (lookups, conditionals, saved state) identified and reported — either updated to match, or flagged for owner review if the change is non-trivial.
7. Add a new line to `CHANGELOG.md` under the unreleased / current build section:
   > `Renamed triathlon race labels from "Full Ironman" / "Half Ironman" to "Long Course" / "Middle Distance" for trademark compliance.`

---

## Out of scope (separate work)

- **Sports tab visual redesign** — unblocked by this change but tracked separately.
- **S25 (Triathlon back button)** — covered by snag list, separate fix.
- **Triathlon screen functional changes** — none. This is a labels-only rename.

---

## Rollback

If anything breaks, the rename is purely string substitution — revert the four lines and the changelog entry. No data migrations, no schema changes.
