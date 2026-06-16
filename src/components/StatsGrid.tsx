import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WeeklyStatsShareSheet } from "@/components/WeeklyStatsShareSheet";

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.5-4 1-6-1 4 3.5 5 3.5 8.5a4.5 4.5 0 1 1-9 0c0-1 .3-2 1-3 .3 1 .9 1.5 1.5 1.5Z" />
  </svg>
)

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r=".6" fill="currentColor" />
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

const ZapIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17 }}>
    <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
  </svg>
)

const STATS_CONFIG = [
  { id: "calories", Icon: FlameIcon, label: "Kcal this week", accent: "rgb(251,113,21)" },
  { id: "workouts", Icon: TargetIcon, label: "Workouts this week", accent: "rgb(244,50,75)" },
  { id: "minutes", Icon: ClockIcon, label: "Mins this week", accent: "rgb(255,46,136)" },
  { id: "activeDays", Icon: ZapIcon, label: "Active days", accent: "rgb(255,176,32)" },
] as const

export const StatsGrid = () => {
  const { user } = useAuth()
  const [values, setValues] = useState({ calories: 0, workouts: 0, minutes: 0, activeDays: 0 })
  const [showShareSheet, setShowShareSheet] = useState(false)

  useEffect(() => {
    if (user) fetchStats()
  }, [user])

  const fetchStats = async () => {
    if (!user) return

    const now = new Date()
    const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMonday)
    monday.setHours(0, 0, 0, 0)
    const weekStart = monday.toISOString()

    const { data } = await supabase
      .from("workout_progress")
      .select("duration_seconds, calories_burned, completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", weekStart)

    if (!data) return

    const totalSecs = data.reduce((acc, p) => acc + (p.duration_seconds || 0), 0)
    const totalCals = data.reduce((acc, p) => acc + (p.calories_burned ?? Math.floor((p.duration_seconds || 0) / 60 * 7)), 0)
    const distinctDays = new Set(data.map(p => p.completed_at?.slice(0, 10))).size

    setValues({
      calories: Math.floor(totalCals),
      workouts: data.length,
      minutes: Math.floor(totalSecs / 60),
      activeDays: distinctDays,
    })
  }

  const displayValues: Record<string, string> = {
    calories: values.calories > 0 ? values.calories.toLocaleString() : "0",
    workouts: values.workouts.toString(),
    minutes: values.minutes.toString(),
    activeDays: values.activeDays.toString(),
  }

  return (
    <div className="px-5 -mt-14 relative z-10">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {STATS_CONFIG.map(({ id, Icon, label, accent }) => (
          <div
            key={id}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 18,
              padding: 15,
              border: "1px solid hsl(228 12% 26%)",
              background: "linear-gradient(150deg, hsl(228 16% 17%), hsl(228 18% 11%))",
              boxShadow: "0 10px 24px -10px hsl(0 0% 0% / .6)",
            }}
          >
            {/* Charged shimmer line */}
            <div style={{
              position: "absolute",
              inset: "0 0 auto 0",
              height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              opacity: 0.8,
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums", textShadow: "0 1px 4px hsl(0 0% 0% / .25)" }}>
                  {displayValues[id]}
                </p>
                <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(228 8% 62%)", marginTop: 4, lineHeight: 1.3 }}>
                  {label}
                </p>
              </div>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                background: `color-mix(in srgb, ${accent} 22%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: accent,
              }}>
                <Icon />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowShareSheet(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-semibold tracking-wide active:bg-white/10 transition-colors touch-manipulation"
      >
        <Share2 size={13} />
        Share My Stats
      </button>

      {showShareSheet && (
        <WeeklyStatsShareSheet
          workouts={values.workouts}
          minutes={values.minutes}
          streak={values.activeDays}
          calories={values.calories}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </div>
  )
}
