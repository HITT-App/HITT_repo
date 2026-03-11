

# Reactions, Notification System, and Public Profiles

## What needs to change

### 1. Post Reactions (beyond just heart)
Currently only a heart/like exists. We'll add emoji reactions (like Facebook: ❤️ 😂 😮 🔥 💪 👏).

**Database**: New `community_reactions` table replacing the single like model. Each row stores `user_id`, `post_id`, `reaction_type`. The existing `community_likes` table stays for backward compat but reactions become the primary UI.

```sql
CREATE TABLE public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL DEFAULT 'heart',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);
-- RLS: users manage own, authenticated can read
```

**UI**: Long-press or tap on the like button shows a reaction picker popover with 6 emoji options. Quick tap defaults to heart. Display grouped reaction counts below the post (e.g., "❤️ 3  🔥 2").

**Files**: `CommunityFeed.tsx` (reaction picker + display), new `useReactions.ts` hook, trigger to update `likes_count` on community_posts.

---

### 2. Full Notification System (Facebook-style)
The existing `community_notifications` table and triggers already handle like, comment, follow, comment_like, and mention events. The `CommunityNotifications.tsx` page exists but needs enhancement.

**Additions needed**:
- **Friend request notifications**: Add `'friend_request'` and `'friend_accept'` types. Create DB trigger on `user_friends` table inserts/updates to auto-create notifications.
- **Reaction notifications**: Update the like notification trigger to include reaction type in notification metadata.
- **Unread badge on nav**: Show unread count badge on the community bell icon in the bottom nav / header.
- **Rich notification cards**: Show reaction emoji, post preview text, and timestamp in notification list.

**Database changes**:
- New trigger on `user_friends` for friend_request/accept notifications
- Update `create_like_notification` trigger to include reaction_type metadata
- Add a `metadata` jsonb column to `community_notifications` for extra context (reaction type, post preview)

**Files**: `CommunityNotifications.tsx` (enhanced UI), `useCommunityNotifications.ts` (add friend request types), new migration, `BottomNav.tsx` or community header (unread badge).

---

### 3. Public User Profile (Facebook-style)
The current `CommunityProfile.tsx` is entirely **hardcoded dummy data** and ignores the `:userId` route param. It needs a complete rewrite.

**New profile page features**:
- **Cover photo + avatar** (pulled from `community_profiles` banner_url/avatar_url)
- **User info**: Display name, username, bio, member since date, follower/following/post counts (all from `community_profiles`)
- **Action buttons**: Follow/Unfollow, Message, Add Friend (using `user_friends` table)
- **"About" section**: Bio, fitness goals
- **Posts tab**: User's actual posts from `community_posts` filtered by `user_id`
- **Mutual friends / followers** count
- **Own profile detection**: If viewing your own profile, show "Edit Profile" button instead of Follow/Message

**Files**: Complete rewrite of `CommunityProfile.tsx`, uses `useCommunityProfile(userId)`, `useCommunityPosts` filtered, `useCommunityActions`.

---

### 4. Friend Request System
The `user_friends` table exists with status field. Need UI to:
- Send friend requests from profile page
- Accept/decline in notifications
- Show friend status on profiles

**Files**: New `useFriends.ts` hook, integrated into `CommunityProfile.tsx` and `CommunityNotifications.tsx`.

---

## Database Migrations

```sql
-- 1. Reactions table
CREATE TABLE public.community_reactions ( ... );

-- 2. Add metadata to notifications
ALTER TABLE public.community_notifications 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 3. Friend request notification triggers
CREATE OR REPLACE FUNCTION public.create_friend_request_notification() ...
CREATE TRIGGER on_friend_request AFTER INSERT ON user_friends ...
CREATE TRIGGER on_friend_accept AFTER UPDATE ON user_friends ...
```

## Files to Create/Modify
- **New**: `src/hooks/useReactions.ts`, `src/hooks/useFriends.ts`, `src/components/community/ReactionPicker.tsx`
- **Rewrite**: `src/pages/CommunityProfile.tsx`
- **Modify**: `src/pages/CommunityFeed.tsx` (reactions UI), `src/pages/CommunityNotifications.tsx` (friend requests, reaction types, richer cards), `src/hooks/useCommunityNotifications.ts` (new notification types), `src/components/BottomNav.tsx` (unread badge)
- **Migration**: 1 new migration file

