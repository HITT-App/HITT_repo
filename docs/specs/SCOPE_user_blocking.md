# User blocking — scope

The existing "Blocked Users" list in Community Profile Settings and the
`community_blocks` table + `useBlockedUsers` hook are already shipped. What
was missing was the **entry point** to block someone, and the **filter** to
actually hide their content. This doc covers the v1 implementation that
closes that loop.

## What ships in v1

### Triggers (where you can block)

- **Post 3-dot menu in CommunityFeed** — every post by another user shows a
  "Block @user" item below "Hide". Tapping it opens a confirmation sheet
  (block is a heavier action than hide, deserves a confirm step).
- **Future** (not v1): community profile screen — already requested in the
  backlog as a separate task, will reuse the same hook.

### Confirmation

A small AlertDialog (already in the design system) titled
"Block @username?" with body: "You won't see their posts, comments or
reactions. They won't be notified. You can unblock from Settings."
Buttons: Cancel / Block (destructive).

### What blocking does, v1

- **Hide their posts** from your feed (client-side filter using
  `community_blocks.blocked_id`).
- **Hide their comments** on posts you view (client-side filter).
- **Hide their reactions** counts from the post engagement bar — fall back
  to the trigger-maintained total (acceptable; v1 doesn't recompute).

### What blocking does NOT do, v1

- It does **not** prevent the blocked user from seeing your posts (would
  need RLS changes on `community_posts` SELECT; deferred to v2).
- It does **not** block DMs — DM feature ships separately and will hook
  into the same table when it lands.
- It does **not** retroactively delete existing follows or likes — those
  rows stay, they just stop being surfaced.

## Data model — no changes

`community_blocks` already exists with:
- `blocker_id`, `blocked_id`, `created_at`
- RLS: `blocker_id = auth.uid()` for SELECT/INSERT/DELETE
- Unique (blocker_id, blocked_id) keeps double-blocks idempotent

## Client filtering

`useCommunityPosts` and `useCommunityComments` each fetch the current user's
block set on mount (one extra query, cached by user.id) and filter the
returned rows. Cheap — the average user blocks a handful of accounts at
most, so the in-memory `Set<string>.has()` filter is O(1) per row.

When a fresh block is applied, the post fetch refetches so the blocked
user's content disappears immediately.

## Self-block guard

The Block menu item is conditionally rendered only when `post.user_id !==
currentUser.id`. The hook also rejects `blockUser(currentUser.id)` defensively.

## Telemetry / moderation hooks

None in v1. Block is a private, consensual action. If/when we add a
"Report" flow, that's a separate table and a separate API call to ops.

## Out of scope, tracked elsewhere

- Profile-page block button (backlog)
- Blocking from DMs (waits for DM feature)
- RLS-level enforcement so blocked users can't even fetch your rows
  (v2 — needs a `community_blocks` SELECT join in the posts policy and
  performance review)
