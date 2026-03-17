import {
  Waves, Footprints, Activity, Dumbbell, Mountain,
  TreePine, Bike, Flame, PersonStanding, Zap,
  Heart, Wind, Swords, Music, Anchor,
  CircleDot, Trophy, Target, Snowflake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TrackerType = "gps" | "timer";
export type CounterLabel = "Sets" | "Laps" | "Rounds";

export interface SportConfig {
  name: string;
  icon: LucideIcon;
  color: string;
  /** Metabolic Equivalent of Task – research-calibrated per ACSM/Compendium */
  met: number;
  tracker: TrackerType;
  counterLabel: CounterLabel;
  /** Expected HR zone 1-5 for watch calibration */
  expectedHRZone?: number;
  /** Watch-sync capable metric types */
  watchMetrics?: string[];
}

// ── MET values sourced from Ainsworth's Compendium of Physical Activities (2024) ──
export const SPORT_CONFIG: Record<string, SportConfig> = {
  // ═══ GPS-tracked sports ═══
  Run:              { name: "Run",              icon: Footprints,     color: "text-green-400",   met: 9.8,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 4, watchMetrics: ["steps", "heartRate", "distance", "calories"] },
  "Trail Run":      { name: "Trail Run",        icon: Mountain,       color: "text-emerald-400", met: 10.5, tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 4, watchMetrics: ["steps", "heartRate", "distance", "calories"] },
  Walk:             { name: "Walk",             icon: PersonStanding, color: "text-sky-400",     met: 3.5,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 2, watchMetrics: ["steps", "heartRate", "distance", "calories"] },
  "Power Walk":     { name: "Power Walk",       icon: Zap,            color: "text-sky-500",     met: 5.0,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["steps", "heartRate", "distance", "calories"] },
  Hike:             { name: "Hike",             icon: TreePine,       color: "text-lime-400",    met: 6.0,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["steps", "heartRate", "distance", "calories"] },
  Cycling:          { name: "Cycling",          icon: Bike,           color: "text-cyan-400",    met: 7.5,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["heartRate", "distance", "calories"] },
  "Mountain Bike":  { name: "Mountain Bike",    icon: Mountain,       color: "text-cyan-600",    met: 8.5,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 4, watchMetrics: ["heartRate", "distance", "calories"] },

  // ═══ Gym / Strength ═══
  Workout:          { name: "Workout",          icon: Activity,       color: "text-orange-400",  met: 6.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["heartRate", "calories"] },
  "Weight Training": { name: "Weight Training", icon: Dumbbell,       color: "text-red-400",     met: 5.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["heartRate", "calories"] },
  "Bodyweight":     { name: "Bodyweight",       icon: PersonStanding, color: "text-orange-500",  met: 5.5,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["heartRate", "calories"] },
  "Functional":     { name: "Functional",       icon: Target,         color: "text-amber-500",   met: 6.5,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["heartRate", "calories"] },
  "CrossFit":       { name: "CrossFit",         icon: Trophy,         color: "text-red-500",     met: 9.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },

  // ═══ HIIT / Cardio ═══
  HIIT:             { name: "HIIT",             icon: Flame,          color: "text-amber-400",   met: 8.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },
  "Tabata":         { name: "Tabata",           icon: Flame,          color: "text-red-600",     met: 10.0, tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },
  "Circuit":        { name: "Circuit Training", icon: Zap,            color: "text-amber-600",   met: 8.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 4, watchMetrics: ["heartRate", "calories"] },
  "Stair Climber":  { name: "Stair Climber",    icon: Mountain,       color: "text-orange-600",  met: 9.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 4, watchMetrics: ["steps", "heartRate", "calories"] },
  "Jump Rope":      { name: "Jump Rope",        icon: Zap,            color: "text-pink-500",    met: 11.0, tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },
  "Rowing":         { name: "Rowing",           icon: Waves,          color: "text-blue-500",    met: 7.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 4, watchMetrics: ["heartRate", "calories"] },
  "Elliptical":     { name: "Elliptical",       icon: Activity,       color: "text-indigo-400",  met: 5.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["heartRate", "calories"] },

  // ═══ Water Sports ═══
  Swim:             { name: "Swim",             icon: Waves,          color: "text-blue-400",    met: 7.0,  tracker: "timer", counterLabel: "Laps",   expectedHRZone: 4, watchMetrics: ["heartRate", "calories"] },
  Surf:             { name: "Surf",             icon: Waves,          color: "text-teal-400",    met: 3.5,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 2, watchMetrics: ["heartRate", "calories"] },
  "Kayak":          { name: "Kayak",            icon: Anchor,         color: "text-teal-500",    met: 5.0,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["heartRate", "distance", "calories"] },
  "Paddleboard":    { name: "Paddleboard (SUP)", icon: Waves,         color: "text-teal-300",    met: 6.0,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["heartRate", "distance", "calories"] },

  // ═══ Mind & Body ═══
  Yoga:             { name: "Yoga",             icon: PersonStanding, color: "text-purple-400",  met: 2.5,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 1, watchMetrics: ["heartRate", "calories"] },
  "Pilates":        { name: "Pilates",          icon: Heart,          color: "text-pink-400",    met: 3.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 2, watchMetrics: ["heartRate", "calories"] },
  "Stretching":     { name: "Stretching",       icon: Wind,           color: "text-violet-400",  met: 2.3,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 1, watchMetrics: ["heartRate"] },
  "Meditation":     { name: "Meditation",       icon: Heart,          color: "text-indigo-300",  met: 1.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 1, watchMetrics: ["heartRate"] },
  "Tai Chi":        { name: "Tai Chi",          icon: Wind,           color: "text-emerald-300", met: 3.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 1, watchMetrics: ["heartRate"] },

  // ═══ Combat / Martial Arts ═══
  "Boxing":         { name: "Boxing",           icon: Swords,         color: "text-red-500",     met: 7.8,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },
  "Kickboxing":     { name: "Kickboxing",       icon: Swords,         color: "text-red-600",     met: 10.3, tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },
  "MMA":            { name: "MMA",              icon: Swords,         color: "text-red-700",     met: 9.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 5, watchMetrics: ["heartRate", "calories"] },
  "Jiu-Jitsu":      { name: "Jiu-Jitsu",       icon: Swords,         color: "text-slate-400",   met: 5.0,  tracker: "timer", counterLabel: "Rounds", expectedHRZone: 4, watchMetrics: ["heartRate", "calories"] },

  // ═══ Dance & Fun ═══
  "Dance":          { name: "Dance",            icon: Music,          color: "text-fuchsia-400", met: 5.5,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["steps", "heartRate", "calories"] },
  "Zumba":          { name: "Zumba",            icon: Music,          color: "text-fuchsia-500", met: 7.0,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 4, watchMetrics: ["steps", "heartRate", "calories"] },

  // ═══ Court / Ball Sports ═══
  "Tennis":         { name: "Tennis",           icon: CircleDot,      color: "text-yellow-400",  met: 7.3,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 4, watchMetrics: ["heartRate", "calories"] },
  "Basketball":     { name: "Basketball",       icon: CircleDot,      color: "text-orange-500",  met: 6.5,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 4, watchMetrics: ["steps", "heartRate", "calories"] },
  "Football":       { name: "Football",         icon: CircleDot,      color: "text-green-500",   met: 7.0,  tracker: "gps",   counterLabel: "Sets",   expectedHRZone: 4, watchMetrics: ["steps", "heartRate", "distance", "calories"] },
  "Badminton":      { name: "Badminton",        icon: CircleDot,      color: "text-lime-500",    met: 5.5,  tracker: "timer", counterLabel: "Sets",   expectedHRZone: 3, watchMetrics: ["heartRate", "calories"] },

  // ═══ Winter ═══
  "Skiing":         { name: "Skiing",           icon: Snowflake,      color: "text-blue-300",    met: 7.0,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["heartRate", "distance", "calories"] },
  "Snowboarding":   { name: "Snowboarding",     icon: Snowflake,      color: "text-blue-400",    met: 5.3,  tracker: "gps",   counterLabel: "Laps",   expectedHRZone: 3, watchMetrics: ["heartRate", "distance", "calories"] },
};

export function getSportConfig(name: string): SportConfig {
  return SPORT_CONFIG[name] ?? SPORT_CONFIG["Workout"];
}

export function getTrackerRoute(sportName: string): string {
  const config = getSportConfig(sportName);
  return config.tracker === "gps" ? "/activity-live" : "/gym-timer";
}

/** Get calibrated calorie burn for a given sport, weight, and duration */
export function calculateCalories(sportName: string, weightKg: number, durationSeconds: number): number {
  const config = getSportConfig(sportName);
  return Math.round(config.met * weightKg * (durationSeconds / 3600));
}

/** Validate watch HR data against expected zone for the sport */
export function validateWatchHR(sportName: string, avgHR: number, restingHR: number = 60, maxHR: number = 190): {
  isValid: boolean;
  expectedZone: number;
  actualZone: number;
  accuracy: "excellent" | "good" | "low";
} {
  const config = getSportConfig(sportName);
  const hrRange = maxHR - restingHR;
  const hrPercent = ((avgHR - restingHR) / hrRange) * 100;

  let actualZone = 1;
  if (hrPercent >= 90) actualZone = 5;
  else if (hrPercent >= 80) actualZone = 4;
  else if (hrPercent >= 70) actualZone = 3;
  else if (hrPercent >= 60) actualZone = 2;

  const expectedZone = config.expectedHRZone ?? 3;
  const zoneDiff = Math.abs(actualZone - expectedZone);

  return {
    isValid: zoneDiff <= 1,
    expectedZone,
    actualZone,
    accuracy: zoneDiff === 0 ? "excellent" : zoneDiff === 1 ? "good" : "low",
  };
}

/** All sport categories for the sport picker */
export const SPORT_CATEGORIES = [
  { title: "Running & Walking", sports: ["Run", "Trail Run", "Walk", "Power Walk", "Hike"] },
  { title: "Cycling", sports: ["Cycling", "Mountain Bike"] },
  { title: "Strength", sports: ["Weight Training", "Bodyweight", "Functional", "CrossFit"] },
  { title: "HIIT & Cardio", sports: ["HIIT", "Tabata", "Circuit", "Jump Rope", "Stair Climber", "Rowing", "Elliptical"] },
  { title: "Water Sports", sports: ["Swim", "Surf", "Kayak", "Paddleboard"] },
  { title: "Mind & Body", sports: ["Yoga", "Pilates", "Stretching", "Meditation", "Tai Chi"] },
  { title: "Combat", sports: ["Boxing", "Kickboxing", "MMA", "Jiu-Jitsu"] },
  { title: "Dance", sports: ["Dance", "Zumba"] },
  { title: "Ball Sports", sports: ["Tennis", "Basketball", "Football", "Badminton"] },
  { title: "Winter", sports: ["Skiing", "Snowboarding"] },
];
