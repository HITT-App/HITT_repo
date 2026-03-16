import {
  Waves, Footprints, Activity, Dumbbell, Mountain,
  TreePine, Bike, Flame, PersonStanding,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TrackerType = "gps" | "timer";
export type CounterLabel = "Sets" | "Laps" | "Rounds";

export interface SportConfig {
  name: string;
  icon: LucideIcon;
  color: string;
  met: number;
  tracker: TrackerType;
  counterLabel: CounterLabel;
}

export const SPORT_CONFIG: Record<string, SportConfig> = {
  // GPS-tracked sports
  Run:              { name: "Run",              icon: Footprints,     color: "text-green-400",  met: 9.8, tracker: "gps",   counterLabel: "Laps" },
  "Trail Run":      { name: "Trail Run",        icon: Mountain,       color: "text-emerald-400",met: 10.0,tracker: "gps",   counterLabel: "Laps" },
  Walk:             { name: "Walk",             icon: PersonStanding, color: "text-sky-400",    met: 3.5, tracker: "gps",   counterLabel: "Laps" },
  Hike:             { name: "Hike",             icon: TreePine,       color: "text-lime-400",   met: 6.0, tracker: "gps",   counterLabel: "Laps" },
  Cycling:          { name: "Cycling",          icon: Bike,           color: "text-cyan-400",   met: 7.5, tracker: "gps",   counterLabel: "Laps" },

  // Timer + Sets
  Workout:          { name: "Workout",          icon: Activity,       color: "text-orange-400", met: 8.0, tracker: "timer",  counterLabel: "Sets" },
  "Weight Training": { name: "Weight Training", icon: Dumbbell,       color: "text-red-400",    met: 5.0, tracker: "timer",  counterLabel: "Sets" },
  HIIT:             { name: "HIIT",             icon: Flame,          color: "text-amber-400",  met: 8.0, tracker: "timer",  counterLabel: "Rounds" },

  // Timer + Laps / duration-focused
  Swim:             { name: "Swim",             icon: Waves,          color: "text-blue-400",   met: 7.0, tracker: "timer",  counterLabel: "Laps" },
  Surf:             { name: "Surf",             icon: Waves,          color: "text-teal-400",   met: 3.5, tracker: "timer",  counterLabel: "Sets" },
  Yoga:             { name: "Yoga",             icon: PersonStanding, color: "text-purple-400", met: 2.5, tracker: "timer",  counterLabel: "Rounds" },
};

export function getSportConfig(name: string): SportConfig {
  return SPORT_CONFIG[name] ?? SPORT_CONFIG["Workout"];
}

export function getTrackerRoute(sportName: string): string {
  const config = getSportConfig(sportName);
  return config.tracker === "gps" ? "/activity-live" : "/gym-timer";
}
