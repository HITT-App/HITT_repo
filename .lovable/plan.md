

# Redesign Community Chatroom

## Current Issues
- Basic styling, no message grouping by date, no empty state illustration
- Input area is plain, no visual polish
- Missing: online user count indicator, message date separators, typing feel, scroll-to-bottom button
- The input bar lacks the bottom nav clearance

## Plan

### 1. Rewrite `src/pages/CommunityChatroom.tsx` with a polished design

**Header**: Cleaner header with online pulse indicator, member count, subtle gradient border bottom

**Messages area**:
- Group messages by date with centered date separator pills
- Consecutive messages from same user collapse (no repeated avatar/name)
- Own messages: primary gradient bubble, right-aligned, no avatar
- Other messages: subtle muted bubble, left-aligned with avatar + name
- Smooth auto-scroll with a "scroll to bottom" FAB when user scrolls up

**Empty state**: Friendly illustration with icon + descriptive text

**Input area**:
- Rounded pill-style input with integrated send button
- Proper safe-area padding to clear the bottom nav
- Subtle focus ring animation

**Visual polish**:
- Messages animate in with a subtle fade
- Timestamps shown inline, smaller
- Clean spacing following the 4px grid system

### Technical Details
- Single file change: `src/pages/CommunityChatroom.tsx`
- Uses existing `chatroom_messages` table + realtime subscription (no DB changes)
- Uses existing UI components (Avatar, Button, ScrollArea)
- Adds date grouping logic with `date-fns` (already installed)
- Adds scroll-to-bottom detection via scroll event listener

