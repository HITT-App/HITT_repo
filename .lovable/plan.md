

# Admin Moderation Controls for Community Chatroom

## Changes

### 1. Database Migration
- Add DELETE policy on `chatroom_messages` for admins: `has_role(auth.uid(), 'admin')` 
- Add UPDATE policy on `chatroom_messages` for admins (to support pinning/editing)
- Add `is_pinned` boolean column (default false) to `chatroom_messages`

### 2. Update `src/pages/CommunityChatroom.tsx`
- Import and use `useAdminRole` hook to detect admin users
- Add admin action menu on each message (long-press or icon):
  - **Delete message** — removes from DB with confirmation
  - **Pin message** — sets `is_pinned = true`, pinned message shows at top of chat
- Add admin badge next to admin usernames (small shield icon)
- Add pinned message banner at top of message area (dismissible, clicking scrolls to message)
- Listen for DELETE events on realtime channel (not just INSERT) so deleted messages disappear live for all users
- Add online user count in header using presence channel state

### 3. Files Changed
- **DB migration**: DELETE + UPDATE policies for admins, `is_pinned` column
- `src/pages/CommunityChatroom.tsx` — add admin controls, pin banner, delete handler, admin badge, realtime DELETE listener

