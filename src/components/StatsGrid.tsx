import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WeeklyStatsShareSheet } from "@/components/WeeklyStatsShareSheet";

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.5-4 1-6-1 4 3.5 5 3.5 8.5a4.5 4.5 0 1 1-9 0c0-1 .3-2 1-3 .3 1 .9 1.5 1.5 1.5Z" />
  </svg>
)

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r=".6" fill="currentColor" />
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

const ZapIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
    <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
  </svg>
)

const STATS_CONFIG = [
  { id: "calories",   Icon: FlameIcon,  label: "Kcal this week",     bg: "linear-gradient(150deg, hsl(20 78% 46%), hsl(12 80% 37%))",   glow: "hsl(16 75% 32% / .42)" },
  { id: "workouts",   Icon: TargetIcon, label: "Workouts this week",  bg: "linear-gradient(150deg, hsl(352 62% 48%), hsl(346 68% 38%))", glow: "hsl(350 60% 32% / .42)" },
  { id: "minutes",    Icon: ClockIcon,  label: "Mins this week",      bg: "linear-gradient(150deg, hsl(176 48% 40%), hsl(186 56% 30%))", glow: "hsl(182 50% 28% / .42)" },
  { id: "activeDays", Icon: ZapIcon,    label: "Active days",         bg: "linear-gradient(150deg, hsl(44 78% 50%), hsl(36 82% 40%))",  glow: "hsl(40 75% 34% / .42)" },
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
      .not("completed_at", "is", null)
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {STATS_CONFIG.map(({ id, Icon, label, bg, glow }) => (
          <div
            key={id}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 20,
              padding: 17,
              minHeight: 108,
              border: "1px solid hsl(220 30% 10% / .8)",
              background: bg,
              boxShadow: [
                "0 0 0 6px hsl(228 18% 10%)",
                `0 12px 26px -12px ${glow}`,
                "0 3px 8px -2px hsl(0 0% 0% / .5)",
                "inset 0 1px 0 hsl(0 0% 100% / .16)",
              ].join(", "),
              color: "#fff",
            }}
          >
            {/* Top highlight line */}
            <div style={{
              position: "absolute",
              inset: "0 0 auto 0",
              height: 1,
              background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / .28), transparent)",
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums", textShadow: "0 1px 4px hsl(0 0% 0% / .3)" }}>
                  {displayValues[id]}
                </p>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(0 0% 100% / .8)", marginTop: 5, lineHeight: 1.3 }}>
                  {label}
                </p>
              </div>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "hsl(0 0% 0% / .22)",
                border: "1px solid hsl(0 0% 0% / .28)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: "#fff",
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
