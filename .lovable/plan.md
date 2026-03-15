

## Routes & Trails Feature

Inspired by the Strava-style reference screenshot, this feature adds a full route discovery and creation system to the app.

### What gets built

1. **Database: `routes` table** -- stores route metadata (name, description, distance, elevation, difficulty, surface type, coordinates/polyline, creator, thumbnail, tags)

2. **New page: `RoutesExplorer` (`/routes`)** -- full-screen map view with:
   - Search bar at top with "Saved" bookmark button
   - Filter chips: Routes, Length, Elevation, Surface, Difficulty
   - Dark satellite/terrain map showing nearby routes as colored polylines
   - Current location indicator with blue pulse
   - "Create Route" floating button
   - Bottom card showing nearest/selected route with thumbnail, name, difficulty badge, distance, elevation, estimated time, and "Made for you" AI tag
   - Map layer toggle and re-center buttons

3. **New page: `RouteDetail` (`/route/:id`)** -- route detail view with:
   - Full map showing the route polyline
   - Stats bar (distance, elevation gain, estimated time, surface %)
   - Elevation profile chart
   - "Start This Route" button that launches ActivityLive pre-loaded with the route
   - Save/share actions
   - Turn-by-turn direction points (optional)

4. **New page: `CreateRoute` (`/routes/create`)** -- tap-on-map to plot waypoints, or record a route from a completed activity:
   - Draw mode: tap map to add points, undo last point
   - Name, description, difficulty, surface type fields
   - Save to database

5. **Route integration into ActivityLive** -- when a route is selected, overlay it as a ghost trail on the live map so users can follow it during their activity

6. **Navigation entry points**:
   - Add "Routes" button to the ChooseSportSheet
   - Add route to BottomNav or Activity section on home
   - Link from ActivityHistory to save a completed activity as a route

### Technical approach

- **Database migration**: Create `routes` table with columns: `id`, `user_id`, `name`, `description`, `distance_km`, `elevation_gain_m`, `estimated_minutes`, `difficulty` (easy/moderate/hard), `surface_type`, `coordinates` (JSONB array of `{lat, lng, alt?}`), `is_public`, `thumbnail_url`, `tags`, `created_at`. RLS: public routes readable by all authenticated users, own routes fully manageable.
- **Map**: Reuse Leaflet with CartoDB dark tiles (consistent with ActivityLive). Render route polylines from coordinate arrays. Use existing `LiveActivityMap` patterns.
- **Filters**: Client-side filtering on the fetched routes list (distance range, difficulty, surface).
- **"Create Route"**: Simple tap-to-add-waypoint on Leaflet map, compute distance/elevation client-side via haversine.
- **Save activity as route**: After completing an ActivityLive session, add "Save as Route" option in CompletionSummary.
- **New files**: `src/pages/RoutesExplorer.tsx`, `src/pages/RouteDetail.tsx`, `src/pages/CreateRoute.tsx`, `src/hooks/useRoutes.ts`
- **Route constants**: Add `ROUTES.ROUTES_EXPLORER`, `ROUTES.CREATE_ROUTE`, `ROUTES.routeDetail(id)` to `src/lib/routes.ts`
- **App.tsx**: Register 3 new lazy-loaded routes

### Scope for first iteration

Focus on RoutesExplorer (map + list) and RouteDetail pages, plus the database table. CreateRoute and ActivityLive integration follow as a second pass to keep the first implementation manageable.

