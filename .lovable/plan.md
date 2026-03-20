

## Make chatroom users clickable to navigate to their profile

### What changes
Two areas in the chatroom need to become clickable links to user profiles:

1. **Avatar** (lines 808-817): Wrap the `Avatar` component in a clickable element that navigates to `/community/user/{userId}`
2. **Sender name** (lines 821-833): Wrap the sender name text in a clickable element that navigates to `/community/user/{userId}`

### Technical details

**File: `src/pages/CommunityChatroom.tsx`**

- Wrap the `Avatar` (line 810) with an `onClick` handler: `() => navigate(\`/community/user/${msg.user_id}\`)` with `cursor-pointer` styling
- Wrap the sender name `<p>` tag (line 823) with an `onClick` handler to the same route, adding `cursor-pointer hover:underline` styling
- For "You" (own messages), clicking navigates to `/profile` instead
- Use `e.stopPropagation()` on both click handlers to prevent triggering the message tap/reaction actions

