#!/usr/bin/env python3
"""
Search YouTube for workout videos and update the workouts table.
Usage: YOUTUBE_API_KEY=<key> python3 scripts/populate_videos.py | supabase db query --linked
"""

import os
import urllib.request
import urllib.parse
import json
import time

API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
if not API_KEY:
    raise SystemExit("Set YOUTUBE_API_KEY environment variable first.")

# Map workout_id → search query optimised for a good embeddable workout video
WORKOUT_SEARCHES = {
    # HIIT
    "1b1110aa-9b6f-4941-9979-9757932353fe": "10 minute beginner HIIT workout no equipment",
    "758ade27-161c-439b-b2ee-01fbf37c506f": "tabata workout 20 minutes full body",
    "3a2f5e3a-5a7e-4e1d-97ea-19e2a6936f31": "HIIT core finisher ab workout",
    "075307b9-a356-4d64-8da6-0b6bfcc87c33": "full body HIIT blaze workout intermediate",
    "25cede78-45de-4795-8002-09a8cdb7adc9": "HIIT cardio crusher workout no equipment",
    "41dcb06f-63b1-4ea6-b50b-9932679c1897": "30 minute full body HIIT workout advanced",
    "b14a8305-daf7-4f34-ade2-b1366d8c5efd": "advanced HIIT burnout workout intense",
    # Cardio
    "e4b27cae-42b7-4aa6-8d99-e36d323018ab": "beginner running workout for beginners",
    "c65caf8c-1c8a-4669-bcd2-539273175f03": "low impact step cardio workout beginner",
    "5af9141f-6a6b-4781-864e-acf8ac1d157a": "kickboxing basics workout beginner cardio",
    "604d7f8c-5422-40f9-9b29-295ced1fff9f": "interval running workout intermediate",
    "93e4c62d-220d-46c2-be7b-18241aaa5d04": "HIIT cardio burn workout 20 minutes",
    # Strength
    "47e15def-18bb-4a2c-9a3c-4c10bbee73ea": "upper body strength workout beginner dumbbells",
    "02b9cd83-c540-4cf5-a1ed-80323ea2663f": "upper body basics workout beginner",
    "dbf1a6a2-a890-40c4-a7e0-d4b1f077837e": "core foundation workout beginner",
    "ac03cc54-3de8-4221-af86-c694093f69a4": "core crusher ab workout intermediate",
    "2ebf5499-ce81-42fc-bc7e-a9c56f0111ac": "back workout dumbbells intermediate",
    "3e8a1ffc-28dd-48f5-ae01-329413148700": "lower body power workout legs intermediate",
    "b657b88a-afc6-4d2e-b9f1-9d62ca5162d1": "full body strength circuit workout dumbbells",
    "498b953d-940a-445b-8217-04de32b496c9": "lower body blast advanced leg workout",
    # Flexibility / Yoga
    "ce2a42c5-2ac1-4144-b585-9a2b4c771834": "yoga flow beginner full body 20 minutes",
    # Mobility
    "6326a0a7-2130-44cc-a42e-8fcdf6dda253": "morning mobility flow routine 10 minutes",
    "4dd4467a-4865-4a96-8543-aac613f03b1d": "hip opener mobility flow routine",
    "5b91b335-6115-43d2-9a8e-cc606aabf50b": "post workout stretch cool down routine",
    # Recovery
    "16aa73d4-bcd7-46aa-88b0-b747e27ee839": "breathing and reset relaxation routine",
    "30a689e4-ee86-495a-939f-f7cbd5d8b69b": "foam rolling guide full body recovery",
    # Warm-Up
    "2a7580e8-ab2d-468e-b761-fb2352446c80": "dynamic warm up full body 5 minutes",
    "aaa5858e-ec7f-40ea-81be-bef5002ba643": "upper body warm up primer routine",
}


def search_youtube(query: str):
    params = urllib.parse.urlencode({
        "part": "snippet",
        "q": query,
        "type": "video",
        "videoEmbeddable": "true",
        "videoDuration": "medium",  # 4–20 min
        "maxResults": 1,
        "key": API_KEY,
    })
    url = f"https://www.googleapis.com/youtube/v3/search?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
        items = data.get("items", [])
        if items:
            video_id = items[0]["id"]["videoId"]
            return f"https://www.youtube.com/watch?v={video_id}"
    except Exception as e:
        print(f"-- ERROR searching '{query}': {e}", flush=True)
    return None


print("BEGIN;")
print("")

found = 0
for workout_id, query in WORKOUT_SEARCHES.items():
    print(f"-- Searching: {query}", flush=True, file=__import__('sys').stderr)
    video_url = search_youtube(query)
    if video_url:
        found += 1
        safe_url = video_url.replace("'", "''")
        print(f"UPDATE workouts SET video_url = '{safe_url}' WHERE id = '{workout_id}';")
    else:
        print(f"-- No result for: {workout_id}")
    time.sleep(0.2)  # stay well within quota

print("")
print("COMMIT;")
print(f"", file=__import__('sys').stderr)
print(f"Done: {found}/{len(WORKOUT_SEARCHES)} videos found.", file=__import__('sys').stderr)
