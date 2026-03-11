

# Feature-Packed Community Chatroom

## Current State
The `chatroom_messages` table only has `content`, `display_name`, `user_id`, `created_at`. Text-only messages, no media support.

## Plan

### 1. Database Migration
Add columns to `chatroom_messages`:
- `message_type` TEXT (default 'text') — values: 'text', 'image', 'voice', 'gif'
- `media_url` TEXT (nullable) — URL for images, voice notes, GIFs
- `reply_to_id` UUID (nullable, FK to self) — for reply threading

### 2. Rewrite `src/pages/CommunityChatroom.tsx`
Major feature additions:

**Image sharing**: Attachment button opens file picker, uploads to `community-images` bucket (existing), sends message with `message_type: 'image'` and `media_url`. Images render as rounded thumbnails in bubbles with tap-to-fullscreen lightbox.

**GIF picker**: Integration with Tenor/GIPHY API via a search sheet. User searches, taps a GIF, sends as `message_type: 'gif'` with the GIF URL. Will use the free Tenor API (no key required for basic usage) embedded in the client.

**Voice notes**: Hold-to-record using MediaRecorder API. Records audio, uploads to `community-images` bucket as `.webm`, sends as `message_type: 'voice'`. Renders as a playable waveform-style audio bar in the bubble.

**Reply threading**: Long-press or swipe on a message shows reply option. Reply banner appears above input showing quoted message. Sends with `reply_to_id`. Rendered as a small quoted block above the bubble.

**Message reactions**: Tap-and-hold shows emoji picker (subset: 🔥 💪 ❤️ 😂 👏). Stored client-side initially, can be extended to DB later.

**Typing indicator**: Simple presence channel showing "X is typing..." below messages.

**Enhanced input bar**: Plus (+) button expands attachment options (camera, gallery, GIF, voice). Animated transitions between states.

### 3. New Components
- `src/components/chatroom/GifPicker.tsx` — Sheet with search + grid of GIF results
- `src/components/chatroom/VoiceRecorder.tsx` — Hold-to-record UI with timer + waveform
- `src/components/chatroom/ImageLightbox.tsx` — Full-screen image viewer
- `src/components/chatroom/ReplyPreview.tsx` — Quoted reply banner above input

### 4. Files Changed
- **DB migration**: Add `message_type`, `media_url`, `reply_to_id` columns
- `src/pages/CommunityChatroom.tsx` — Full rewrite with all features
- `src/components/chatroom/GifPicker.tsx` — New
- `src/components/chatroom/VoiceRecorder.tsx` — New
- `src/components/chatroom/ImageLightbox.tsx` — New
- `src/components/chatroom/ReplyPreview.tsx` — New

### Technical Notes
- Reuses existing `community-images` storage bucket for image/voice uploads
- Voice recording uses native `MediaRecorder` API (no dependencies)
- GIF search uses Tenor API (free tier, no key needed for limited usage)
- Typing indicators use Supabase Realtime presence channel
- All new message types render gracefully — unknown types fall back to text

