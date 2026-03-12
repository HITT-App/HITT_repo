

## AI Activity Image Generator

### What we're building
A "Generate Share Image" button on the CompletionSummary screen that uses AI image generation to create a stylized, dramatic activity summary graphic (like the Strava-style screenshot reference — stats overlaid on a cinematic scene). Users can then save or share it.

### Changes

#### 1. New edge function (`supabase/functions/generate-activity-image/index.ts`)
- Accepts activity data (distance, pace, time, calories, activity type)
- Calls `google/gemini-3-pro-image-preview` via the Lovable AI Gateway with a prompt like: *"Create a dramatic, cinematic fitness poster showing a runner silhouette with glowing trail. Overlay stats: Distance 13.46 km, Pace 6:55/km, Time 1h 33m. Dark moody atmosphere, neon glow trail effect."*
- Returns the base64 image
- Uploads to Supabase storage bucket `activity-images` and returns the public URL
- Handles auth, rate limits (429/402)

#### 2. Storage bucket
- Create `activity-images` bucket via migration for storing generated images
- RLS: authenticated users can insert their own, public read

#### 3. Update CompletionSummary (`src/components/workout/CompletionSummary.tsx`)
- Add "Generate Share Image ✨" button below the map/stats section
- On click, calls the edge function with activity stats
- Shows loading state with shimmer animation while generating (~10-15s)
- Displays the generated image in a lightbox/preview card
- Add "Save Image" (download) and option to include it in the community post when sharing

#### 4. Update ActivityLive completion (`src/pages/ActivityLive.tsx`)
- Pass activity type to CompletionSummary so the image prompt can reference the sport (running, cycling, etc.)

### Technical details
- Uses `google/gemini-3-pro-image-preview` for highest quality image generation
- Edge function uploads base64 result to storage to avoid passing huge payloads back to client
- The generated image URL can be attached to the `community_posts` `image_url` field when sharing
- No new DB tables needed — uses existing `community_posts.image_url` + new storage bucket

