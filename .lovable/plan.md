

# Add Light/Dark Theme Toggle

## Approach
The project already has `next-themes` installed, a full `.dark` CSS variable set in `index.css`, and `darkMode: ["class"]` in Tailwind config. The infrastructure is ready — just needs a `ThemeProvider` wrapper and a toggle in the UI.

## Changes

### 1. Create ThemeProvider wrapper (`src/components/ThemeProvider.tsx`)
- Wrap the app with `next-themes` `ThemeProvider` using `attribute="class"`, `defaultTheme="light"`, `storageKey="hiit-theme"`.

### 2. Wire into App (`src/App.tsx`)
- Wrap root content with `<ThemeProvider>`.

### 3. Add toggle to Profile page (`src/pages/Profile.tsx`)
- Add an "Appearance" section with a Sun/Moon icon and a Switch that toggles between light and dark using `useTheme()` from `next-themes`.
- Place it near the Voice Activation section for consistency.

### 4. Add toggle to FullNavMenu (`src/components/FullNavMenu.tsx`)
- Add a quick theme toggle button in the drawer header area so users can switch from anywhere.

**Total: 4 files touched, ~30 lines added.**

