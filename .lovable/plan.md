

# Redesign Profile Page — Facebook-Style Public Profile Editor

## Problem
The current `/profile` page is a flat settings form. Users can't see how their public profile looks while editing it. The community profile settings exist on a separate page (`/community/profile/settings`), creating a fragmented experience.

## Solution
Transform the Profile page into a Facebook-style experience where users see their public profile as others would see it, with inline editing capabilities. Merge the community profile editing (banner, username, bio) directly into this page.

### New Profile Page Layout

```text
┌─────────────────────────────┐
│  ← Profile          ⚙ Save │
├─────────────────────────────┤
│  ▓▓▓▓▓ BANNER ▓▓▓▓▓  📷   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│  ┌──────┐                   │
│  │Avatar│ 📷               │
│  └──────┘                   │
│  Display Name    ✏ edit     │
│  @username       ✏ edit     │
│  Bio text here   ✏ edit     │
│  📅 Joined Mar 2025         │
├─────────────────────────────┤
│  Stats: Posts│Followers│...  │
├─────────────────────────────┤
│ [Profile] [Settings] tabs   │
├─────────────────────────────┤
│ Profile tab:                │
│  • Streak Card              │
│  • Badges & Achievements    │
│  • Fitness Goal selector    │
│                             │
│ Settings tab:               │
│  • Appearance (dark mode)   │
│  • Voice Activation         │
│  • Privacy (public/private) │
│  • Password Change          │
│  • Blocked Users            │
│  • Sign Out                 │
└─────────────────────────────┘
```

### Key Changes

**`src/pages/Profile.tsx`** — Full rewrite:
- **Hero section**: Banner image with camera overlay to change it, avatar overlapping the banner (like Facebook/Instagram)
- **Inline editing**: Tap display name, username, or bio to edit them in-place (input fields appear on tap)
- **Stats row**: Posts, Followers, Following, Friends counts pulled from community profile
- **Two tabs**: "Profile" (badges, streak, fitness goal) and "Settings" (appearance, voice, privacy, password, blocked users, sign out)
- Import and use `useCommunityProfile` and `useCommunityActions` alongside the existing `useProfile` hook to sync both profile tables
- Use `ImageCropperDialog` for avatar and banner uploads (same as community settings)
- Merge blocked users list from `useBlockedUsers`

### Data Flow
- Banner + username + bio + privacy → saved to `community_profiles` via `createOrUpdateProfile`
- Display name + avatar + fitness goal → saved to `profiles` via `updateProfile`
- Avatar changes sync to both tables automatically

### Files to modify
- **`src/pages/Profile.tsx`** — Redesigned with hero banner, inline editing, tabbed layout merging community profile features

