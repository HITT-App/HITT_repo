#!/usr/bin/env python3
"""
Populate the workouts table with thumbnails and seed workout_exercises
using exercise data structured for each workout.
Run: python3 scripts/seed_workouts.py | supabase db query --linked
"""

import json

# Thumbnails: deterministic fitness photos via picsum (free, no API key)
def thumb(seed):
    return f"https://picsum.photos/seed/{seed}/800/450"

# ---------------------------------------------------------------------------
# EXERCISES per workout_id
# Format: (title, description, body_area, sets, reps, duration_seconds, order_index)
# sets/reps are None for timed exercises, duration_seconds None for rep-based
# ---------------------------------------------------------------------------
EXERCISES = {
    # ── HIIT ────────────────────────────────────────────────────────────────
    "1b1110aa-9b6f-4941-9979-9757932353fe": [  # HIIT Quick 10 (beginner)
        ("Jumping Jacks", "Stand with feet together, jump while spreading arms and legs wide. Land softly.", "full-body", None, None, 40, 1),
        ("Bodyweight Squat", "Stand feet hip-width apart, lower hips until thighs are parallel. Drive through heels to stand.", "legs", 3, 15, None, 2),
        ("High Knees", "Run on the spot driving knees up to waist height. Pump arms for balance.", "full-body", None, None, 40, 3),
        ("Push-Up", "Place hands shoulder-width apart, lower chest to floor keeping body straight. Press back up.", "chest", 3, 10, None, 4),
        ("Mountain Climbers", "In plank position, alternate driving knees toward chest at speed.", "core", None, None, 40, 5),
        ("Rest", "Active rest — walk or march on the spot.", "full-body", None, None, 30, 6),
    ],
    "758ade27-161c-439b-b2ee-01fbf37c506f": [  # Tabata Classic (intermediate)
        ("Burpee", "From standing, drop to a squat, kick feet back to plank, do a push-up, jump feet in and leap up with arms overhead.", "full-body", None, None, 20, 1),
        ("Jump Squat", "Perform a squat then explode upward. Land softly with bent knees.", "legs", None, None, 20, 2),
        ("Push-Up", "Hands shoulder-width, body straight, lower chest to floor and press back up.", "chest", None, None, 20, 3),
        ("Mountain Climbers", "In plank, drive knees alternately toward chest as fast as possible.", "core", None, None, 20, 4),
        ("Burpee", "Second Tabata round — maintain form over speed.", "full-body", None, None, 20, 5),
        ("Jump Squat", "Second Tabata round.", "legs", None, None, 20, 6),
        ("Push-Up", "Second Tabata round.", "chest", None, None, 20, 7),
        ("Mountain Climbers", "Second Tabata round.", "core", None, None, 20, 8),
    ],
    "3a2f5e3a-5a7e-4e1d-97ea-19e2a6936f31": [  # HIIT Core Finisher (intermediate)
        ("Plank Hold", "On forearms and toes, keep hips level and core braced. Breathe steadily.", "core", 3, None, 40, 1),
        ("Bicycle Crunch", "Lie on back, bring opposite elbow to knee while extending the other leg.", "core", 3, 20, None, 2),
        ("V-Sit Hold", "Sit on floor, lean back slightly and raise straight legs to form a V. Hold.", "core", 3, None, 30, 3),
        ("Russian Twist", "Sit with knees bent, lean back 45°, rotate torso side to side with hands clasped.", "core", 3, 20, None, 4),
        ("Leg Raise", "Lie flat, raise straight legs to 90°, lower slowly without letting feet touch the floor.", "core", 3, 15, None, 5),
        ("Mountain Climbers", "In plank, drive knees toward chest alternately at pace.", "core", None, None, 40, 6),
    ],
    "075307b9-a356-4d64-8da6-0b6bfcc87c33": [  # Full Body HIIT Blaze (intermediate)
        ("Burpee", "Full burpee with push-up and jump. Keep a steady rhythm.", "full-body", None, None, 45, 1),
        ("Jump Lunge", "Lunge then jump, switching legs mid-air. Land softly in the opposite lunge.", "legs", None, None, 40, 2),
        ("Push-Up to T", "After each push-up, rotate into a side plank, raising one arm overhead.", "chest", None, None, 40, 3),
        ("Squat Pulse", "Hold the bottom of a squat and pulse 2 inches up and down.", "legs", 3, 20, None, 4),
        ("Plank Jack", "In plank position, jump feet apart and together like a jumping jack.", "core", None, None, 40, 5),
        ("Sprint in Place", "Drive arms hard and pump knees as high and fast as you can.", "full-body", None, None, 30, 6),
    ],
    "25cede78-45de-4795-8002-09a8cdb7adc9": [  # HIIT Cardio Crusher (intermediate)
        ("Jumping Jacks", "Classic jumping jacks to elevate heart rate.", "full-body", None, None, 45, 1),
        ("Squat Jump", "Squat deeply then explode upward. Land with soft knees.", "legs", None, None, 40, 2),
        ("High Knees", "Run on spot, driving knees to waist height at speed.", "full-body", None, None, 45, 3),
        ("Burpee", "Drop to plank, press up, jump back to feet, leap and clap overhead.", "full-body", None, None, 40, 4),
        ("Lateral Shuffle", "Shuffle quickly side-to-side in an athletic stance, 4 steps each direction.", "legs", None, None, 40, 5),
        ("Box Jump (or Squat Jump)", "Jump onto a sturdy surface or substitute a squat jump if no box is available.", "legs", None, None, 30, 6),
    ],
    "41dcb06f-63b1-4ea6-b50b-9932679c1897": [  # Full Body HIIT (advanced)
        ("Burpee with Push-Up", "Full burpee with a push-up at the bottom. No rest between reps.", "full-body", None, None, 45, 1),
        ("Jump Lunge", "Plyometric lunges with a powerful jump to switch legs.", "legs", None, None, 45, 2),
        ("Clapping Push-Up", "Explosive push-up that gets hands off the ground for a clap at the top.", "chest", 3, 10, None, 3),
        ("Tuck Jump", "Jump as high as possible, tucking knees to chest at the top.", "full-body", None, None, 40, 4),
        ("Spider-Man Push-Up", "As you lower, bring one knee to the same-side elbow. Alternate each rep.", "chest", 3, 12, None, 5),
        ("Hollow Body Hold", "Lie on back, press lower back into floor and raise arms and legs slightly. Hold.", "core", 3, None, 30, 6),
        ("Broad Jump + Sprint Back", "Jump forward as far as possible, sprint back to start.", "full-body", None, None, 40, 7),
    ],
    "b14a8305-daf7-4f34-ade2-b1366d8c5efd": [  # HIIT Advanced Burnout (advanced)
        ("Burpee Broad Jump", "Perform a burpee then broad jump forward instead of jumping straight up.", "full-body", None, None, 45, 1),
        ("Pistol Squat (Assisted)", "Single-leg squat holding TRX or door frame for balance if needed.", "legs", 3, 8, None, 2),
        ("Plyometric Push-Up", "Explosive push-up, hands leave the ground at the top.", "chest", 3, 10, None, 3),
        ("Jump Squat 180", "Squat then jump 180°, landing in a squat. Alternate direction each rep.", "legs", None, None, 40, 4),
        ("Plank to Downward Dog", "From plank, push hips up into downward dog, return to plank. Continuous.", "core", None, None, 45, 5),
        ("Mountain Climbers", "Max speed mountain climbers for the full interval.", "core", None, None, 45, 6),
        ("Lateral Burpee", "Burpee, then lateral jump over a line (or imaginary line) to the side.", "full-body", None, None, 45, 7),
    ],
    # ── CARDIO ──────────────────────────────────────────────────────────────
    "e4b27cae-42b7-4aa6-8d99-e36d323018ab": [  # Beginner Run Workout
        ("Brisk Walk Warm-Up", "Walk at a fast, purposeful pace, swinging arms.", "full-body", None, None, 300, 1),
        ("Easy Jog", "Light jog at a pace you can hold a conversation.", "full-body", None, None, 180, 2),
        ("Walk Recovery", "Slow walk to bring heart rate down.", "full-body", None, None, 120, 3),
        ("Easy Jog", "Second jog interval, same easy pace.", "full-body", None, None, 180, 4),
        ("Walk Recovery", "Walk recovery.", "full-body", None, None, 120, 5),
        ("Cool-Down Walk", "Slow walk to finish, deep breathing.", "full-body", None, None, 300, 6),
    ],
    "c65caf8c-1c8a-4669-bcd2-539273175f03": [  # Low-Impact Step Cardio
        ("Step Touch", "Step side to side rhythmically, tapping foot at each step.", "full-body", None, None, 60, 1),
        ("Knee Lift March", "March lifting knees to hip height, arms swinging.", "full-body", None, None, 60, 2),
        ("Step and Tap", "Step forward and back, tapping at each end.", "full-body", None, None, 60, 3),
        ("Lateral Step-Out", "Wide step out to each side, bringing feet together each time.", "legs", None, None, 60, 4),
        ("Step Touch with Arms", "Step side to side with overhead arm raises.", "full-body", None, None, 60, 5),
        ("Seated March (rest)", "Sit and march knees up if needed — low impact rest option.", "full-body", None, None, 60, 6),
    ],
    "5af9141f-6a6b-4781-864e-acf8ac1d157a": [  # Kickboxing Basics
        ("Jab-Cross", "Stand in guard, extend lead hand (jab) then rear hand (cross). Rotate hips on cross.", "full-body", 3, 20, None, 1),
        ("Jab-Cross-Hook", "Add a lead hook after the cross — elbow at 90°, rotate torso.", "full-body", 3, 15, None, 2),
        ("Front Kick", "Chamber the knee, extend foot forward, pull back. Alternate legs.", "legs", 3, 10, None, 3),
        ("Knee Strike", "Drive the rear knee upward as if striking a pad held at waist height.", "core", 3, 12, None, 4),
        ("Bob and Weave", "Bend knees and roll to each side as if ducking a punch.", "full-body", None, None, 40, 5),
        ("Shadow Boxing Combo", "Continuous jab-cross-hook-cross, moving around the space.", "full-body", None, None, 45, 6),
    ],
    "604d7f8c-5422-40f9-9b29-295ced1fff9f": [  # Interval Run Session (intermediate)
        ("Easy Jog Warm-Up", "5-minute easy jog to warm up.", "full-body", None, None, 300, 1),
        ("Hard Effort Run", "Run at 80% effort — uncomfortable but sustainable.", "full-body", None, None, 60, 2),
        ("Easy Jog Recovery", "Drop to easy conversational jog.", "full-body", None, None, 90, 3),
        ("Hard Effort Run", "Push pace again.", "full-body", None, None, 60, 4),
        ("Easy Jog Recovery", "Easy jog recovery.", "full-body", None, None, 90, 5),
        ("Hard Effort Run", "Final hard interval.", "full-body", None, None, 60, 6),
        ("Cool-Down Jog", "Easy jog, then walk the final minute.", "full-body", None, None, 300, 7),
    ],
    "93e4c62d-220d-46c2-be7b-18241aaa5d04": [  # HIIT Cardio Burn (intermediate)
        ("Jumping Jacks", "Classic jumping jacks at pace.", "full-body", None, None, 45, 1),
        ("High Knees", "Drive knees to waist height alternately at speed.", "full-body", None, None, 45, 2),
        ("Butt Kicks", "Run on the spot kicking heels up toward glutes.", "legs", None, None, 45, 3),
        ("Squat Jump", "Squat and explode upward, landing softly.", "legs", None, None, 40, 4),
        ("Burpee", "Full burpee — no push-up required if beginner.", "full-body", None, None, 40, 5),
        ("Rest", "Catch your breath, walk on the spot.", "full-body", None, None, 30, 6),
    ],
    # ── STRENGTH ────────────────────────────────────────────────────────────
    "47e15def-18bb-4a2c-9a3c-4c10bbee73ea": [  # Upper Body Strength (beginner)
        ("Push-Up", "Hands shoulder-width, lower chest to floor, press back up. Knees down if needed.", "chest", 3, 10, None, 1),
        ("Incline Push-Up", "Hands on bench or table — reduces load for beginners.", "chest", 3, 12, None, 2),
        ("Dumbbell Curl", "Stand with dumbbells at sides, curl toward shoulders without swinging.", "arms", 3, 12, None, 3),
        ("Overhead Tricep Extension", "Hold one dumbbell overhead with both hands, lower behind head, extend up.", "arms", 3, 12, None, 4),
        ("Lateral Raise", "Arms at sides, raise dumbbells out to shoulder height with soft elbows.", "shoulders", 3, 12, None, 5),
        ("Band Pull-Apart", "Hold resistance band at chest, pull ends apart keeping arms straight.", "back", 3, 15, None, 6),
    ],
    "02b9cd83-c540-4cf5-a1ed-80323ea2663f": [  # Upper Body Basics (beginner)
        ("Wall Push-Up", "Stand facing wall, place hands at shoulder height, perform push-up.", "chest", 3, 15, None, 1),
        ("Push-Up", "Progress from wall to floor push-up as strength allows.", "chest", 3, 10, None, 2),
        ("Dumbbell Front Raise", "Hold dumbbells at thighs, raise arms straight to shoulder height.", "shoulders", 3, 12, None, 3),
        ("Dumbbell Curl", "Alternating curls, keeping elbows pinned to sides.", "arms", 3, 12, None, 4),
        ("Tricep Kickback", "Hinge forward with dumbbell, extend arm behind you from the elbow.", "arms", 3, 12, None, 5),
        ("Plank Hold", "Hold forearm plank to finish — upper body stabilisation.", "core", 3, None, 30, 6),
    ],
    "dbf1a6a2-a890-40c4-a7e0-d4b1f077837e": [  # Core Foundation (beginner)
        ("Dead Bug", "Lie on back, arms and legs up. Slowly lower opposite arm and leg toward floor without back arching.", "core", 3, 10, None, 1),
        ("Bird Dog", "On all fours, extend opposite arm and leg, hold 2 seconds, return.", "core", 3, 12, None, 2),
        ("Glute Bridge", "Lie on back, feet flat, drive hips up to a straight line. Squeeze at the top.", "core", 3, 15, None, 3),
        ("Plank Hold", "Forearm plank, keep hips level and breathe.", "core", 3, None, 30, 4),
        ("Side Plank", "Support on one forearm, stack feet, keep hips lifted. Both sides.", "core", 3, None, 20, 5),
        ("Hollow Hold", "Lower back pressed into floor, raise arms and legs slightly, hold.", "core", 3, None, 20, 6),
    ],
    "ac03cc54-3de8-4221-af86-c694093f69a4": [  # Core Crusher (intermediate)
        ("Plank with Shoulder Tap", "In push-up position, tap opposite shoulder alternately without hip rotation.", "core", 3, 20, None, 1),
        ("Hanging Knee Raise", "Hang from bar, draw knees to chest without swinging. (Use floor leg raise if no bar.)", "core", 3, 12, None, 2),
        ("Ab Wheel Rollout", "From knees, roll wheel forward until torso is near parallel, roll back.", "core", 3, 10, None, 3),
        ("Russian Twist", "Sit with knees bent, lean back 45°, rotate torso holding weight.", "core", 3, 24, None, 4),
        ("Bicycle Crunch", "Opposite elbow to knee while extending the other leg, controlled.", "core", 3, 20, None, 5),
        ("Dragon Flag (Progression)", "Lie on bench, grip behind head, raise body straight from hips, lower slowly.", "core", 3, 8, None, 6),
    ],
    "2ebf5499-ce81-42fc-bc7e-a9c56f0111ac": [  # Back Workout 101 (intermediate)
        ("Dumbbell Row", "Hinge forward, row dumbbell to hip, elbow close to body.", "back", 3, 12, None, 1),
        ("Reverse Fly", "Hinged forward, raise dumbbells out to sides with slight elbow bend.", "back", 3, 12, None, 2),
        ("Superman Hold", "Lie face down, raise arms and legs off floor simultaneously. Hold briefly.", "back", 3, 15, None, 3),
        ("Pull-Up or Band-Assisted Pull-Up", "Full hang, pull chin over bar. Use band for assistance if needed.", "back", 3, 8, None, 4),
        ("Face Pull (Band)", "Anchor band at head height, pull toward face with elbows high and wide.", "back", 3, 15, None, 5),
        ("Deadlift (Light)", "Hip-hinge with soft knees, barbell or dumbbells close to legs.", "back", 3, 10, None, 6),
    ],
    "3e8a1ffc-28dd-48f5-ae01-329413148700": [  # Lower Body Power (intermediate)
        ("Barbell Back Squat", "Bar across traps, squat to parallel, drive through heels.", "legs", 4, 8, None, 1),
        ("Romanian Deadlift", "Slight knee bend, hinge forward, lowering weights along legs until stretch felt.", "legs", 3, 10, None, 2),
        ("Walking Lunge", "Step forward into lunge, push through front heel, bring back foot forward.", "legs", 3, 12, None, 3),
        ("Leg Press", "Push platform away through heels, don't lock knees at the top.", "legs", 3, 12, None, 4),
        ("Glute Bridge with Weight", "Dumbbell on hips, drive hips up, squeeze at top.", "legs", 3, 15, None, 5),
        ("Calf Raise", "Stand on step edge, rise onto toes, lower below step level.", "legs", 3, 20, None, 6),
    ],
    "b657b88a-afc6-4d2e-b9f1-9d62ca5162d1": [  # Full Body Strength Circuit (intermediate)
        ("Goblet Squat", "Hold dumbbell at chest, squat deep, elbows inside knees.", "legs", 3, 12, None, 1),
        ("Dumbbell Row", "One hand on bench, row opposite dumbbell to hip.", "back", 3, 12, None, 2),
        ("Push-Up", "Standard push-up, chest touches floor.", "chest", 3, 12, None, 3),
        ("Dumbbell Shoulder Press", "Press dumbbells overhead from shoulder height, arms fully extended.", "shoulders", 3, 10, None, 4),
        ("Reverse Lunge", "Step back, lower knee toward floor, push through front heel to return.", "legs", 3, 12, None, 5),
        ("Plank", "Hold forearm plank to complete the circuit.", "core", 3, None, 40, 6),
    ],
    "498b953d-940a-445b-8217-04de32b496c9": [  # Lower Body Blast (advanced)
        ("Barbell Back Squat", "Heavy squat, 4-5 working sets.", "legs", 5, 5, None, 1),
        ("Bulgarian Split Squat", "Rear foot elevated, front leg does all the work. Heavy dumbbell or barbell.", "legs", 4, 8, None, 2),
        ("Deadlift", "Conventional stance deadlift, max pull of the session.", "legs", 4, 5, None, 3),
        ("Walking Lunge with Weight", "Dumbbells at sides, long strides, full range.", "legs", 3, 16, None, 4),
        ("Leg Extension", "Machine or band — isolate quads, controlled negative.", "legs", 3, 15, None, 5),
        ("Leg Curl", "Machine or band hamstring curl.", "legs", 3, 15, None, 6),
        ("Standing Calf Raise", "Heavy single-leg or bilateral calf raise.", "legs", 4, 20, None, 7),
    ],
    # ── MOBILITY ────────────────────────────────────────────────────────────
    "6326a0a7-2130-44cc-a42e-8fcdf6dda253": [  # Morning Mobility Flow
        ("Cat-Cow", "On all fours, alternate arching and rounding the spine with breath.", "back", None, None, 60, 1),
        ("Hip Circle", "Standing, rotate hips in large circles both directions.", "legs", None, None, 45, 2),
        ("Thoracic Rotation", "Sit cross-legged, hands behind head, rotate torso each side.", "back", None, None, 45, 3),
        ("World's Greatest Stretch", "Lunge forward, place same hand on floor, rotate opposite arm overhead.", "full-body", 2, 5, None, 4),
        ("Ankle Circle", "Seated or standing, circle each ankle slowly both ways.", "legs", None, None, 30, 5),
        ("Neck Roll", "Slowly drop ear to shoulder each side, then chin to chest.", "full-body", None, None, 45, 6),
    ],
    "4dd4467a-4865-4a96-8543-aac613f03b1d": [  # Hip Opener Flow
        ("Figure Four Stretch", "Lie on back, cross ankle over knee, flex foot, pull thigh toward chest.", "legs", None, None, 60, 1),
        ("90-90 Hip Stretch", "Sit with both knees at 90°, rotate forward onto front shin, then switch.", "legs", None, None, 60, 2),
        ("Pigeon Pose", "From downward dog, bring one knee to the floor behind same-side wrist.", "legs", None, None, 60, 3),
        ("Lizard Pose", "Low lunge with both hands inside the front foot. Sink hips forward.", "legs", None, None, 60, 4),
        ("Seated Butterfly", "Soles together, hinge forward from hips, not rounding the back.", "legs", None, None, 60, 5),
        ("Supine Hip Rotation", "Lie on back, cross knee over and let it fall to opposite side. Hold.", "legs", None, None, 60, 6),
    ],
    "5b91b335-6115-43d2-9a8e-cc606aabf50b": [  # Post-Workout Stretch
        ("Standing Quad Stretch", "Balance on one foot, pull heel to glutes. Knee pointed down.", "legs", None, None, 45, 1),
        ("Standing Hamstring Stretch", "Place heel on low surface, hinge forward from hips, chest toward shin.", "legs", None, None, 45, 2),
        ("Cross-Body Shoulder Stretch", "Pull arm across chest with opposite hand.", "shoulders", None, None, 40, 3),
        ("Tricep Stretch", "Raise arm, bend elbow behind head, gently push elbow with opposite hand.", "arms", None, None, 40, 4),
        ("Seated Spinal Twist", "Sit with one leg extended, cross other foot over, rotate toward raised knee.", "back", None, None, 45, 5),
        ("Child's Pose", "Kneel, sit back on heels, extend arms forward on floor, breathe.", "back", None, None, 60, 6),
    ],
    # ── FLEXIBILITY / YOGA ───────────────────────────────────────────────────
    "ce2a42c5-2ac1-4144-b585-9a2b4c771834": [  # Yoga Flow (beginner)
        ("Child's Pose", "Kneel with big toes together, lower hips to heels, extend arms forward.", "back", None, None, 60, 1),
        ("Cat-Cow", "On hands and knees, inhale into cow (belly drops), exhale into cat (back rounds).", "back", None, None, 60, 2),
        ("Downward Dog", "Hands and feet planted, hips high, heels pressing toward floor.", "full-body", None, None, 60, 3),
        ("Warrior I", "Lunge stance, arms overhead, front knee over ankle, back foot at 45°.", "full-body", None, None, 45, 4),
        ("Warrior II", "Turn to face the side, arms extended parallel to floor, gaze over front hand.", "full-body", None, None, 45, 5),
        ("Seated Forward Fold", "Legs straight, hinge from hips and reach toward feet.", "legs", None, None, 60, 6),
        ("Savasana", "Lie flat, arms at sides, eyes closed. Full relaxation.", "full-body", None, None, 120, 7),
    ],
    # ── RECOVERY ────────────────────────────────────────────────────────────
    "16aa73d4-bcd7-46aa-88b0-b747e27ee839": [  # Breathing and Reset
        ("Box Breathing", "Inhale 4 counts, hold 4, exhale 4, hold 4. Repeat.", "full-body", None, None, 120, 1),
        ("Diaphragmatic Breathing", "Lie on back, hand on belly. Breathe into the belly, not the chest.", "full-body", None, None, 120, 2),
        ("4-7-8 Breathing", "Inhale 4 counts, hold 7, exhale slowly for 8. Promotes calm.", "full-body", None, None, 120, 3),
        ("Progressive Relaxation", "Tense and release each muscle group from feet to head.", "full-body", None, None, 180, 4),
        ("Legs Up The Wall", "Lie on back with legs straight up against a wall. Breathe slowly.", "full-body", None, None, 180, 5),
    ],
    "30a689e4-ee86-495a-939f-f7cbd5d8b69b": [  # Foam Rolling Guide
        ("Calf Roll", "Sit on floor, place roller under calves, roll from ankle to knee.", "legs", None, None, 60, 1),
        ("IT Band Roll", "Lie on side, roller under outer thigh, roll from hip to knee.", "legs", None, None, 60, 2),
        ("Quad Roll", "Face down, roller under front of thigh, roll from hip to knee.", "legs", None, None, 60, 3),
        ("Thoracic Spine Roll", "Upper back on roller, support head, roll between shoulder blades.", "back", None, None, 60, 4),
        ("Lat Roll", "Lie on side with roller under armpit, roll down the side of back.", "back", None, None, 45, 5),
        ("Glute Roll", "Sit on roller, cross ankle over knee, roll the glute.", "legs", None, None, 45, 6),
    ],
    # ── WARM-UP ──────────────────────────────────────────────────────────────
    "2a7580e8-ab2d-468e-b761-fb2352446c80": [  # Dynamic Warm-Up
        ("Arm Circle", "Stand and make large forward and backward circles with each arm.", "shoulders", None, None, 30, 1),
        ("Leg Swing", "Hold wall for balance, swing one leg forward and back, then side-to-side.", "legs", None, None, 30, 2),
        ("Hip Circle", "Hands on hips, rotate in wide circles both directions.", "full-body", None, None, 30, 3),
        ("Inchworm", "Hinge forward, walk hands to plank, do a push-up, walk feet to hands.", "full-body", None, None, 40, 4),
        ("High Knee March", "Lift knees to hip height in a slow controlled march.", "full-body", None, None, 40, 5),
        ("Bodyweight Squat", "Slow, controlled squat with a 2-second pause at the bottom.", "legs", 2, 10, None, 6),
        ("Jumping Jacks", "Light jumping jacks to raise heart rate gently.", "full-body", None, None, 30, 7),
    ],
    "aaa5858e-ec7f-40ea-81be-bef5002ba643": [  # Upper Body Primer
        ("Arm Circle", "Small to large arm circles, forward and back.", "shoulders", None, None, 30, 1),
        ("Band Pull-Apart", "Hold band at chest, pull ends wide, squeeze shoulder blades.", "back", 2, 15, None, 2),
        ("Shoulder Rotation", "Hinge forward, let arms hang, rotate in circles from the shoulder.", "shoulders", None, None, 30, 3),
        ("Wall Slide", "Stand with back and forearms against wall, slide arms overhead and back.", "shoulders", 2, 10, None, 4),
        ("Push-Up (half speed)", "Slow push-up, 3 seconds down, 1 second up — warming joints, not exhausting.", "chest", 2, 8, None, 5),
        ("Wrist Circle", "Extend arms, make slow circles with wrists both ways.", "arms", None, None, 30, 6),
    ],
}

# Thumbnail photos per workout ID
THUMBNAILS = {
    # HIIT
    "1b1110aa-9b6f-4941-9979-9757932353fe": "https://picsum.photos/seed/hiit-beginner/800/450",
    "758ade27-161c-439b-b2ee-01fbf37c506f": "https://picsum.photos/seed/tabata/800/450",
    "3a2f5e3a-5a7e-4e1d-97ea-19e2a6936f31": "https://picsum.photos/seed/core-hiit/800/450",
    "075307b9-a356-4d64-8da6-0b6bfcc87c33": "https://picsum.photos/seed/hiit-blaze/800/450",
    "25cede78-45de-4795-8002-09a8cdb7adc9": "https://picsum.photos/seed/cardio-crusher/800/450",
    "41dcb06f-63b1-4ea6-b50b-9932679c1897": "https://picsum.photos/seed/full-body-hiit/800/450",
    "b14a8305-daf7-4f34-ade2-b1366d8c5efd": "https://picsum.photos/seed/advanced-burnout/800/450",
    # Cardio
    "e4b27cae-42b7-4aa6-8d99-e36d323018ab": "https://picsum.photos/seed/beginner-run/800/450",
    "c65caf8c-1c8a-4669-bcd2-539273175f03": "https://picsum.photos/seed/step-cardio/800/450",
    "5af9141f-6a6b-4781-864e-acf8ac1d157a": "https://picsum.photos/seed/kickboxing/800/450",
    "604d7f8c-5422-40f9-9b29-295ced1fff9f": "https://picsum.photos/seed/interval-run/800/450",
    "93e4c62d-220d-46c2-be7b-18241aaa5d04": "https://picsum.photos/seed/hiit-cardio/800/450",
    # Strength
    "47e15def-18bb-4a2c-9a3c-4c10bbee73ea": "https://picsum.photos/seed/upper-strength/800/450",
    "02b9cd83-c540-4cf5-a1ed-80323ea2663f": "https://picsum.photos/seed/upper-basics/800/450",
    "dbf1a6a2-a890-40c4-a7e0-d4b1f077837e": "https://picsum.photos/seed/core-foundation/800/450",
    "ac03cc54-3de8-4221-af86-c694093f69a4": "https://picsum.photos/seed/core-crusher/800/450",
    "2ebf5499-ce81-42fc-bc7e-a9c56f0111ac": "https://picsum.photos/seed/back-workout/800/450",
    "3e8a1ffc-28dd-48f5-ae01-329413148700": "https://picsum.photos/seed/lower-power/800/450",
    "b657b88a-afc6-4d2e-b9f1-9d62ca5162d1": "https://picsum.photos/seed/strength-circuit/800/450",
    "498b953d-940a-445b-8217-04de32b496c9": "https://picsum.photos/seed/lower-blast/800/450",
    # Flexibility/Yoga
    "ce2a42c5-2ac1-4144-b585-9a2b4c771834": "https://picsum.photos/seed/yoga-flow/800/450",
    # Mobility
    "6326a0a7-2130-44cc-a42e-8fcdf6dda253": "https://picsum.photos/seed/morning-mobility/800/450",
    "4dd4467a-4865-4a96-8543-aac613f03b1d": "https://picsum.photos/seed/hip-opener/800/450",
    "5b91b335-6115-43d2-9a8e-cc606aabf50b": "https://picsum.photos/seed/post-workout-stretch/800/450",
    # Recovery
    "16aa73d4-bcd7-46aa-88b0-b747e27ee839": "https://picsum.photos/seed/breathing-reset/800/450",
    "30a689e4-ee86-495a-939f-f7cbd5d8b69b": "https://picsum.photos/seed/foam-rolling/800/450",
    # Warmup
    "2a7580e8-ab2d-468e-b761-fb2352446c80": "https://picsum.photos/seed/dynamic-warmup/800/450",
    "aaa5858e-ec7f-40ea-81be-bef5002ba643": "https://picsum.photos/seed/upper-primer/800/450",
}

def esc(s):
    return s.replace("'", "''")

sql_lines = ["BEGIN;", ""]

# 1. Clear existing sparse exercises
sql_lines.append("DELETE FROM workout_exercises;")
sql_lines.append("")

# 2. Update thumbnails on workouts
for wid, url in THUMBNAILS.items():
    sql_lines.append(f"UPDATE workouts SET thumbnail_url = '{url}' WHERE id = '{wid}';")

sql_lines.append("")

# 3. Insert exercises
for workout_id, exercises in EXERCISES.items():
    for (title, desc, body_area, sets, reps, dur, order_idx) in exercises:
        sets_val = str(sets) if sets is not None else "NULL"
        reps_val = str(reps) if reps is not None else "NULL"
        dur_val = str(dur) if dur is not None else "NULL"
        sql_lines.append(
            f"INSERT INTO workout_exercises (workout_id, title, description, body_area, sets, reps, duration_seconds, order_index) "
            f"VALUES ('{workout_id}', '{esc(title)}', '{esc(desc)}', '{body_area}', {sets_val}, {reps_val}, {dur_val}, {order_idx});"
        )
    sql_lines.append("")

sql_lines.append("COMMIT;")

print("\n".join(sql_lines))
