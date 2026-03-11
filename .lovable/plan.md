

# Make Leaderboard Fully Operational

## Current State
- `ChallengeLeaderboard` page (`/leaderboard`) uses **hardcoded static data** -- fake names, fake progress, no database queries
- `LeaderboardTab` (inside Achievements page) already works with real Supabase data via `useLeaderboard`, `useUserRanking`, `useRealtimeLeaderboard`
- The `leaderboard_scores` table exists with points, rankings, categories, and realtime enabled
- Friends system exists via `user_friends` table
- User levels/XP system exists via `user_levels` table

## Plan

### 1. Rewrite `ChallengeLeaderboard` page to use real data
Replace all static data with live queries from `leaderboard_scores` + `profiles`:

- **Your Place card**: Show the logged-in user's `total_points`, `rank_position`, and `weekly_points` from `useUserRanking`
- **All Leaderboard tab**: Fetch from `useLeaderboard("worldwide")` showing real users with avatars, display names, points
- **Friends tab**: Query `user_friends` (status = accepted) to get friend IDs, then filter `leaderboard_scores` to only show friends
- **Auto-initialize**: If user has no leaderboard entry, create one via `initializeLeaderboard`
- **Realtime**: Subscribe via `useRealtimeLeaderboard` for live rank changes

### 2. Add recommended features

**a. Time-period filter (Weekly / Monthly / All Time)**
- Add a segmented control to toggle between `weekly_points`, `monthly_points`, and `total_points` for sorting/display

**b. User level badge display**
- Show each user's level title and badge from `user_levels` alongside their name (fetch via join)

**c. "You" indicator + scroll-to-self**
- Highlight the current user's row with a ring/border
- Show a floating "Jump to your rank" button if user is not visible in the list

**d. Top 3 podium**
- Display the top 3 users in a visual podium layout (gold/silver/bronze) above the scrollable list

**e. Points breakdown tooltip**
- Show weekly vs monthly vs total points breakdown when tapping a user's score

**f. Pull-to-refresh**
- Invalidate leaderboard queries on pull gesture (or a refresh button)

### 3. Files to modify

- **`src/pages/ChallengeLeaderboard.tsx`** -- Full rewrite: remove static data, integrate hooks, add podium + time filter + friends tab with real data
- **`src/hooks/useAchievements.ts`** -- Add a `useFriendsLeaderboard` hook that fetches accepted friend IDs then queries `leaderboard_scores` filtered to those IDs
- No database changes needed -- existing `leaderboard_scores`, `profiles`, `user_friends`, `user_levels` tables cover all requirements

### Technical Details

**Friends leaderboard query flow:**
```text
1. Query user_friends WHERE (user_id = me OR friend_id = me) AND status = 'accepted'
2. Extract friend user IDs
3. Query leaderboard_scores WHERE user_id IN (friendIds + myId)
4. Join with profiles for display names/avatars
5. Sort by selected point type, assign ranks
```

**Time period mapping:**
- "This Week" → sort by `weekly_points`
- "This Month" → sort by `monthly_points`  
- "All Time" → sort by `total_points`

