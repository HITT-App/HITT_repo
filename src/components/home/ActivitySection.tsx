import React, { useEffect, useState } from "react";
import { ChevronRight, Footprints, PersonStanding, Dumbbell, Bike, Waves, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday } from "date-fns";

interface ActivityLog {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
}

function formatActivityDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function formatActivityType(type: string) {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function getActivityColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'walking': case 'hiking': return '#f97316'
    case 'yoga': case 'pilates': return '#8b5cf6'
    case 'cycling': case 'bikingstationary': return '#22c55e'
    case 'swimming': case 'swimmingpool': return '#38bdf8'
    default: return '#f97316'
  }
}

function getActivityIcon(type: string) {
  const color = getActivityColor(type)
  switch (type.toLowerCase()) {
    case 'walking': case 'hiking': return <Footprints size={18} color={color} strokeWidth={2} />
    case 'yoga': case 'pilates': return <PersonStanding size={18} color={color} strokeWidth={2} />
    case 'cycling': case 'bikingstationary': return <Bike size={18} color={color} strokeWidth={2} />
    case 'swimming': case 'swimmingpool': return <Waves size={18} color={color} strokeWidth={2} />
    default: return <Dumbbell size={18} color={color} strokeWidth={2} />
  }
}

export function ActivitySection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("activity_logs")
      .select("id, activity_type, started_at, ended_at, duration_seconds, calories_burned, avg_heart_rate")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const completedThisWeek = activities.filter((a) => {
    const d = new Date(a.started_at);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }).length;

  return (
    <div className="mt-[22px] mb-2">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5 px-5">
        <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
        <button
          onClick={() => navigate("/activity-dashboard")}
          className="text-sm font-medium text-primary active:opacity-70 transition-opacity flex items-center gap-0.5"
        >
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Weekly progress bar */}
      <div className="px-5 mb-3">
        <div style={{ height: 6, borderRadius: 4, background: 'var(--secondary)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((completedThisWeek / 5) * 100, 100)}%`, background: '#f97316', borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 5, fontWeight: 500 }}>
          {completedThisWeek} / 5 this week
        </p>
      </div>

      {/* Empty state */}
      {!loading && activities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 px-5">
          No activities yet. Complete a workout to see them here.
        </p>
      )}

      {/* Horizontal carousel */}
      {activities.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingLeft: 20, paddingRight: 20, paddingBottom: 4, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type)
            const iconColor = getActivityColor(activity.activity_type)
            return (
              <div
                key={activity.id}
                style={{ width: 152, flexShrink: 0, borderRadius: 16, padding: 13, background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {/* Top row: icon chip + check */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${iconColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icon}
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 99, background: 'rgba(34,197,94,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="#22c55e" strokeWidth={2.6} />
                  </div>
                </div>
                {/* Activity name */}
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatActivityType(activity.activity_type)}
                </p>
                {/* Date + duration */}
                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                  {formatActivityDate(activity.started_at)}{activity.duration_seconds ? ` · ${Math.round(activity.duration_seconds / 60)} min` : ''}
                </p>
                {/* Footer: kcal */}
                {activity.calories_burned != null && (
                  <p style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>
                    {activity.calories_burned} kcal
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
