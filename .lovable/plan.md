

## Community Chatroom Improvements

### 1. Auto-scroll to last message on load
**Problem**: The `scrollToBottom` relies on `bottomRef.current?.scrollIntoView()` but the `bottomRef` div may not be rendered or the scroll container may not be the right element. The `ScrollArea` vs raw div ref mismatch could cause issues.

**Fix**: After messages load (loading transitions to false), use `scrollContainerRef` to set `scrollTop = scrollHeight` with `"instant"` behavior so there's no visible scroll animation on initial load. Also ensure `bottomRef` is placed correctly and scroll fires after DOM paint via `requestAnimationFrame`.

### 2. User list drawer/sheet
**Problem**: The Users icon button in the header doesn't do anything — it's just a static icon.

**Fix**: Add a Sheet/Drawer that opens when the Users button is clicked, showing all online users from the presence channel state. Store the full presence state (not just count) and display each user's avatar, name, and online indicator. Also show offline users who have sent messages in the chat.

### 3. Additional improvements
- **Long-press to reply on mobile**: The reply button is hover-only (`group-hover:opacity-100`), which doesn't work on mobile. Add a long-press handler or always-visible reply swipe indicator.
- **Message read indicator**: Show a subtle "new messages" divider when the user returns.
- **Scroll-to-bottom button shows unread count**: Show how many new messages arrived while scrolled up.

### Technical approach

**Files to modify**: `src/pages/CommunityChatroom.tsx`

**Scroll fix**:
- In the `useEffect` watching `[messages, loading]`, use `requestAnimationFrame` + set `scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight` with instant behavior on initial load.

**User list**:
- Track presence state as `Map<string, {name, avatar}>` instead of just a count.
- Add `showUserList` state + a `Sheet` component listing online users with avatars.
- Clicking a user navigates to their community profile.

**Mobile reply**:
- Make reply button visible on tap (not just hover) by toggling visibility on single tap/long-press, or always show a small reply icon.

