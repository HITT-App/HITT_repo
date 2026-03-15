

# Implementation Plan: Full Feature Calibration & Enhancement

This plan covers 5 areas you've requested. Here's what needs to happen across each:

---

## 1. Calibrate AI Coach

**Current state:** The AI coach edge function (`ai-coach`) sends messages to the Lovable AI gateway. It has a basic system prompt but lacks personalization from user profile/assessment data.

**Changes:**
- Update `supabase/functions/ai-coach/index.ts` to fetch the user's profile, assessment answers, fitness level, goals, and recent health metrics before constructing the system prompt
- Inject user context (weight, height, fitness level, goals, activity history) into the system prompt so responses are personalized
- Add workout-type awareness so the AI can recommend exercises calibrated to the user's level and preferences

---

## 2. Nutrition — Barcode Scanner & Food Scan

**Current state:** MealScanner exists with camera-based AI food analysis. "Barcode Scan" in NutritionDashboard just redirects to the same MealScanner page — no actual barcode scanning.

**Changes:**
- Create a dedicated `src/pages/BarcodeScanner.tsx` page that uses the device camera to detect barcodes
- Use a client-side barcode detection library (`@AiPx/barcode-detector` or the native `BarcodeDetector` API available in modern browsers)
- Create a new edge function `supabase/functions/lookup-barcode/index.ts` that queries the Open Food Facts API (`https://world.openfoodfacts.org/api/v2/product/{barcode}`) — free, no API key needed
- Wire the barcode result into the existing meal logging flow (`meal_logs` table)
- Update `NutritionDashboard.tsx` to route "Barcode Scan" to `/barcode-scanner` instead of `/meal-scanner`
- Add the route to `App.tsx`

---

## 3. Implement Trail Routes (Enhance Existing)

**Current state:** Routes system exists with create/explore/detail pages using Leaflet. Routes are user-created only.

**Changes:**
- Seed the `routes` table with 15-20 pre-built trail routes across popular locations (Dubai, London, NYC, etc.) with real coordinates, elevation data, and difficulty ratings
- Add a `is_official` boolean column to the `routes` table to distinguish system trails from user-created ones
- Add terrain/scenery tags and a `rating` column for community ratings
- Update `RoutesExplorer.tsx` to show "Official Trails" as a featured section above user routes
- Add a "Rate This Trail" action on `RouteDetail.tsx`

---

## 4. Calibrate Fitness Watch Sync

**Current state:** `useWatchSync` hook exists but only syncs steps and heart rate. It only works on native platforms (Capacitor). No distance, calories, or workout session sync. No automatic background sync.

**Changes:**
- Expand `useWatchSync.ts` to also sync: distance (km), calories burned, active minutes, and sleep data
- Add workout session detection — pull completed workout sessions from HealthKit/Health Connect and map them to activity logs
- Add a "calibration" step in `WatchSyncSection.tsx` where users confirm their wearable type (Apple Watch, Galaxy Watch, Pixel Watch, Fitbit via Health Connect) so the UI can show device-specific instructions
- Add sync frequency preference (manual, every hour, on app open)
- Store device type in `profiles` table via a new `watch_type` column
- Show last-synced data comparison (watch vs app values) for transparency

---

## 5. Workouts Calibrated Per Type

**Current state:** `WorkoutLibrary` fetches from a `workouts` table with category/difficulty/body_areas. The simpler `Workouts` page (`/workouts`) uses hardcoded data. MET values exist in `ActivityLive.tsx` but aren't connected to the workout library.

**Changes:**
- Replace the hardcoded `Workouts` page to pull from the `workouts` table (same as WorkoutLibrary)
- Add a `met_value` column to the `workouts` table so each workout has a calibrated calorie burn rate
- Add a `workout_type` enum column (`strength`, `cardio`, `hiit`, `flexibility`, `yoga`, `martial_arts`, `swimming`, `cycling`) for proper categorization
- Update `WorkoutPlayer.tsx` to use the workout's `met_value` × user weight × duration for accurate calorie calculations instead of static estimates
- Seed the workouts table with calibrated workouts per type (at least 5 per category) with proper MET values, body areas, equipment, and difficulty levels
- Add workout categories to the HIIT home section so users can browse by type

---

## Technical Summary

| Area | Files Modified | Files Created | DB Changes |
|------|---------------|---------------|------------|
| AI Calibration | `ai-coach/index.ts` | — | — |
| Barcode Scanner | `NutritionDashboard.tsx`, `App.tsx` | `BarcodeScanner.tsx`, `lookup-barcode/index.ts` | — |
| Trail Routes | `RoutesExplorer.tsx`, `RouteDetail.tsx` | — | Add `is_official`, `rating` cols; seed data |
| Watch Calibration | `useWatchSync.ts`, `WatchSyncSection.tsx` | — | Add `watch_type` to profiles |
| Workout Calibration | `Workouts.tsx`, `WorkoutPlayer.tsx` | — | Add `met_value`, `workout_type` cols; seed data |

