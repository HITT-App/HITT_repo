

# Fix PostComments Layout Issues

## Problems
1. The comment input bar is hidden behind the bottom navigation
2. The header appears cut off/missing
3. The page layout conflicts with AppLayout's `pb-24` wrapper

## Solution

### 1. Hide bottom nav on comment pages (`AppLayout.tsx`)
Add `/community/post` to `HIDDEN_NAV_ROUTES` -- this is a focused interaction page (like chatroom) with its own header and input bar.

### 2. Fix PostComments layout (`PostComments.tsx`)
- Make the header **sticky** at the top with `z-10`
- Make the comment input **fixed** at the bottom with safe-area padding
- Add bottom padding to the scroll area so content isn't hidden behind the fixed input
- Use `h-screen` with proper flex layout so the scroll area fills available space

### Files to modify
- `src/components/AppLayout.tsx` -- add `/community/post` to hidden nav routes
- `src/pages/PostComments.tsx` -- fix header stickiness, fix input positioning, improve empty state

