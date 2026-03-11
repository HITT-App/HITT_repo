

# Fix Community Feed — Ensure Everything Works

After reviewing the code, here are the issues found and the plan to fix them:

## Issues Identified

1. **Tabs don't filter posts** — "For You", "Trending", and "Following" tabs change `activeTab` state but posts are never filtered by it. All tabs show the same content.

2. **Like doesn't update optimistically** — After liking/unliking, the UI waits for a realtime event to refetch all posts, causing a delay. The like count and heart state should update instantly.

3. **Share button does nothing** — No handler attached; should use the Web Share API or copy link to clipboard.

4. **Save is not persisted** — `savedPosts` is local state only, resets on page reload. Should persist to the database (community_saved_posts or similar).

5. **Success dialog after edit navigates poorly** — After editing a post, the success dialog shows but may not navigate back to the feed properly.

6. **No delete confirmation** — `DeletePostDialog` component exists but isn't used; deleting a post happens immediately without confirmation.

## Plan

### 1. Add tab filtering logic (CommunityFeed.tsx)
- **For You**: Show all posts (default, current behavior)
- **Trending**: Sort by `likes_count` descending
- **Following**: Filter to posts from users the current user follows (query `community_follows` table)
- Add a `useMemo` that filters/sorts `posts` based on `activeTab`
- Fetch the user's following list on mount

### 2. Optimistic like updates (CommunityFeed.tsx)
- On like/unlike, immediately toggle `is_liked` and increment/decrement `likes_count` in local state before the API call completes
- Revert on error

### 3. Wire up Share button (CommunityFeed.tsx)
- Use `navigator.share()` if available (mobile), otherwise copy post link to clipboard with toast feedback

### 4. Use DeletePostDialog for confirmation (CommunityFeed.tsx)
- Import and render `DeletePostDialog`
- Track `pendingDeleteId` state; show dialog on delete click; call `handleDeletePost` on confirm

### 5. Persist saved/bookmarked posts
- Create a `community_saved_posts` table (user_id, post_id) with RLS
- Load saved posts on mount, update `savedPosts` state from DB
- `toggleSave` inserts/deletes from the table

## Technical Details

### Database Migration
```sql
CREATE TABLE IF NOT EXISTS public.community_saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.community_saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved posts"
  ON public.community_saved_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Files Modified
- `src/pages/CommunityFeed.tsx` — Tab filtering, optimistic likes, share, delete confirmation, persisted saves
- `src/hooks/useCommunity.ts` — Add following list fetch for "Following" tab
- New migration for `community_saved_posts` table

