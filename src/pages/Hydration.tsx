import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Target, Flame, Check } from "lucide-react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { format, isToday } from "date-fns";

const GOAL = 2500;
const R = 80;
const CIRC = 2 * Math.PI * R;

// ── Vessel SVGs ───────────────────────────────────────────────
function GlassIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14l-2.5 17H7.5L5 3Z" />
      <line x1="5" y1="3" x2="19" y2="3" />
    </svg>
  );
}
function BottleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6v2.5L17 7v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7l2-2.5V2Z" />
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.4" />
    </svg>
  );
}
function MugIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h12v11a2 2 0 01-2 2H7a2 2 0 01-2-2V8Z" />
      <path d="M17 10h2a2 2 0 010 4h-2" />
      <line x1="9" y1="5" x2="15" y2="5" strokeWidth="1.6" />
    </svg>
  );
}
function FlaskIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2h4v5.5L17 11v9a2 2 0 01-2 2H9a2 2 0 01-2-2v-9l3-3.5V2Z" />
      <line x1="7" y1="15" x2="17" y2="15" strokeWidth="1.4" />
    </svg>
  );
}

function vesselLabel(ml: number) {
  if (ml >= 600) return "Bottle";
  if (ml >= 450) return "Flask";
  if (ml >= 300) return "Mug";
  return "Glass";
}
function VesselIcon({ ml, size = 14 }: { ml: number; size?: number }) {
  if (ml >= 600) return <BottleIcon size={size} />;
  if (ml >= 450) return <FlaskIcon size={size} />;
  if (ml >= 300) return <MugIcon size={size} />;
  return <GlassIcon size={size} />;
}

// ── Main component ────────────────────────────────────────────
const Hydration = () => {
  const navigate = useNavigate();
  const { logMetric, useMetricHistory, useTodayTotal } = useHealthMetrics();
  const { data: history = [] } = useMetricHistory("hydration", 200);
  const { data: todayIntake = 0 } = useTodayTotal("hydration");
  const [showCustom, setShowCustom] = useState(false);
  const [customMl, setCustomMl] = useState("");

  const pct = Math.min(todayIntake / GOAL, 1);
  const remaining = Math.max(0, GOAL - todayIntake);
  const ringFill = pct * CIRC;

  // Pacing: compare current intake to expected at this time of day
  const now = new Date();
  const minutesPassed = now.getHours() * 60 + now.getMinutes();
  const expectedNow = Math.round((minutesPassed / 1440) * GOAL);
  const paceDiff = todayIntake - expectedNow;
  const onTrack = paceDiff >= -150;

  // Today's timeline entries (descending)
  const todayEntries = useMemo(
    () => history.filter(h => isToday(new Date(h.recorded_at))),
    [history],
  );

  // Weekly bar chart (Mon → today)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = format(d, 'yyyy-MM-dd');
      const total = history
        .filter(h => format(new Date(h.recorded_at), 'yyyy-MM-dd') === key)
        .reduce((s, h) => s + Number(h.value), 0);
      return { key, label: format(d, 'EEEEE'), total, hit: total >= GOAL, isToday: i === 6 };
    });
  }, [history]);

  const maxWeekTotal = Math.max(...weekDays.map(d => d.total), GOAL);

  // Streak: consecutive goal-hit days ending today
  const streak = useMemo(() => {
    let count = 0;
    for (let i = weekDays.length - 1; i >= 0; i--) {
      if (weekDays[i].hit) count++;
      else break;
    }
    return count;
  }, [weekDays]);

  const quickLog = async (ml: number) => {
    try {
      await logMetric.mutateAsync({ metric_type: "hydration", value: ml, unit: "ml" });
      toast.success(`${ml} ml logged`);
    } catch { toast.error("Failed to log"); }
  };

  const handleCustomLog = async () => {
    const val = Number(customMl);
    if (!val || val < 1 || val > 5000) { toast.error("Enter 1–5000 ml"); return; }
    await quickLog(val);
    setCustomMl("");
    setShowCustom(false);
  };

  const vessels = [
    { label: "Glass", amount: 250, Icon: GlassIcon },
    { label: "Bottle", amount: 500, Icon: BottleIcon },
    { label: "Mug",   amount: 350, Icon: MugIcon },
    { label: "Flask", amount: 700, Icon: FlaskIcon },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">

      {/* ── Header ── */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-[38px] h-[38px] rounded-[11px] bg-secondary border border-border/60 flex items-center justify-center active:opacity-70 transition-opacity"
        >
          <ArrowLeft size={18} className="text-foreground" strokeWidth={2.2} />
        </button>
        <h1 className="text-base font-semibold">Hydration</h1>
        <div className="w-[38px]" />
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-5 space-y-4 pt-5 pb-28">

        {/* ── Ring hero ── */}
        <div className="bg-card border border-border/60 rounded-[18px] p-6 text-center shadow-sm">
          {/* Ring */}
          <div className="flex justify-center mb-4">
            <svg width={188} height={188} viewBox="0 0 188 188">
              <g transform="rotate(-90, 94, 94)">
                {/* Track */}
                <circle cx="94" cy="94" r={R} fill="none"
                  className="text-sky-500/[0.14] dark:text-sky-400/[0.14]"
                  stroke="currentColor" strokeWidth="13"
                />
                {/* Fill */}
                <circle cx="94" cy="94" r={R} fill="none"
                  className="text-sky-500 dark:text-sky-400"
                  stroke="currentColor" strokeWidth="13" strokeLinecap="round"
                  strokeDasharray={`${ringFill} ${CIRC - ringFill}`}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </g>
              {/* Center text */}
              <text x="94" y="84" textAnchor="middle" className="fill-foreground"
                style={{ fontSize: 40, fontWeight: 800, fontFamily: 'ui-monospace,monospace', letterSpacing: -1 }}>
                {todayIntake >= 1000 ? `${(todayIntake / 1000).toFixed(1)}` : todayIntake}
              </text>
              <text x="94" y="104" textAnchor="middle" className="fill-muted-foreground"
                style={{ fontSize: 16, fontWeight: 600 }}>
                {todayIntake >= 1000 ? 'L' : 'ml'}
              </text>
              <text x="94" y="122" textAnchor="middle" className="fill-muted-foreground"
                style={{ fontSize: 12.5, fontWeight: 600 }}>
                {todayIntake >= GOAL ? 'Goal reached! 🎉' : `${remaining} ml to go`}
              </text>
            </svg>
          </div>

          {/* Pacing chip */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-600 ${
            onTrack
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
          }`}>
            {onTrack
              ? <Check size={13} strokeWidth={2.5} />
              : <span style={{ fontSize: 11 }}>⚠</span>}
            <span className="font-semibold">
              {onTrack
                ? `On track — ${Math.abs(paceDiff)} ml ahead of pace`
                : `${Math.abs(paceDiff)} ml behind pace`}
            </span>
          </div>
        </div>

        {/* ── Quick add ── */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Log a drink</h2>
          <div className="grid grid-cols-2 gap-3">
            {vessels.map(({ label, amount, Icon }) => (
              <button
                key={label}
                onClick={() => quickLog(amount)}
                disabled={logMetric.isPending}
                className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.97] transition-transform shadow-sm"
              >
                <div className="w-11 h-11 rounded-[12px] bg-sky-500/10 dark:bg-sky-400/10 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="text-base font-bold text-foreground">{amount} ml</div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCustom(true)}
            className="mt-3 w-full h-12 rounded-[14px] bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
          >
            <Plus size={16} strokeWidth={2.5} />
            Custom amount
          </button>
        </div>

        {/* ── This week ── */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">This week</h2>
          <div className="bg-card border border-border/60 rounded-[18px] p-4 shadow-sm">
            {/* Streak header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-orange-500/10 flex items-center justify-center">
                  <Flame size={16} className="text-orange-500" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-foreground">{streak}-day streak</div>
                  {streak > 0 && (
                    <div className="text-[11px] text-muted-foreground">Goal hit {streak} day{streak !== 1 ? 's' : ''} in a row</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-sky-500 dark:text-sky-400">
                  {weekDays.length > 0
                    ? `${(weekDays.filter(d => d.hit).length / 7 * 100).toFixed(0)}%`
                    : '0%'}
                </div>
                <div className="text-[10px] text-muted-foreground">goal days</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const barH = day.total > 0 ? Math.max(6, Math.round((day.total / maxWeekTotal) * 56)) : 0;
                return (
                  <div key={day.key} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full rounded-[10px] bg-secondary flex items-end overflow-hidden ${day.hit ? 'ring-1 ring-sky-500/40 dark:ring-sky-400/40' : ''}`}
                      style={{ height: 56 }}
                    >
                      {barH > 0 && (
                        <div
                          className="w-full rounded-[10px_10px_0_0]"
                          style={{
                            height: barH,
                            background: 'linear-gradient(180deg, hsl(199 89% 56%), hsl(205 90% 44%))',
                          }}
                        />
                      )}
                    </div>
                    <span className={`text-[10.5px] font-semibold ${day.isToday ? 'text-sky-500 dark:text-sky-400 font-bold' : 'text-muted-foreground'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Today timeline ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Today</h2>
          </div>
          <div className="bg-card border border-border/60 rounded-[18px] shadow-sm overflow-hidden">
            {todayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nothing logged yet — tap a vessel above</p>
            ) : (
              <>
                {todayEntries.slice(0, 8).map((entry, i) => {
                  const isLast = i === todayEntries.slice(0, 8).length - 1;
                  const ml = Math.round(Number(entry.value));
                  return (
                    <div key={entry.id} className="grid px-4" style={{ gridTemplateColumns: '52px 22px 1fr', alignItems: 'flex-start', paddingTop: i === 0 ? 16 : 0, paddingBottom: isLast ? 0 : 0 }}>
                      {/* Time */}
                      <div className="text-right text-xs font-semibold text-muted-foreground tabular-nums pt-[3px]">
                        {format(new Date(entry.recorded_at), 'h:mm a')}
                      </div>
                      {/* Rail */}
                      <div className="flex flex-col items-center mx-auto" style={{ width: 22 }}>
                        <div className="w-[2px] flex-1 bg-border/60" style={{ minHeight: 6 }} />
                        <div
                          className="w-[13px] h-[13px] rounded-full border-[3px] z-10 shrink-0"
                          style={{
                            background: 'hsl(199 89% 48%)',
                            borderColor: 'var(--card)',
                            boxShadow: '0 0 0 2px hsl(199 89% 48% / 0.3)',
                          }}
                        />
                        {!isLast && <div className="w-[2px] flex-1 bg-border/60" style={{ minHeight: 16 }} />}
                      </div>
                      {/* Content */}
                      <div className="pl-2 pb-4" style={{ paddingTop: 0 }}>
                        <div className="flex items-center gap-2 pt-[1px]">
                          <span className="text-sm font-bold text-foreground">{ml} ml</span>
                          <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                            <span className="text-sky-500 dark:text-sky-400"><VesselIcon ml={ml} size={12} /></span>
                            {vesselLabel(ml)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Footer */}
                <div className="border-t border-border/40 px-4 py-3 flex items-center justify-between">
                  <span className="text-[12.5px] text-muted-foreground">{todayEntries.length} log{todayEntries.length !== 1 ? 's' : ''} today</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    <span className="font-bold text-foreground">{todayIntake >= 1000 ? `${(todayIntake / 1000).toFixed(1)} L` : `${todayIntake} ml`}</span> total
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Goal footer ── */}
        <div className="bg-card border border-border/60 rounded-[18px] px-4 py-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-[11px] bg-sky-500/10 dark:bg-sky-400/10 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Target size={17} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="text-[11.5px] text-muted-foreground">Daily goal</div>
            <div className="text-[14.5px] font-bold text-foreground">{GOAL.toLocaleString()} ml</div>
          </div>
          <button
            onClick={() => toast.info("Goal adjustment coming soon")}
            className="text-[12.5px] font-semibold text-primary active:opacity-70 transition-opacity"
          >
            Adjust
          </button>
        </div>

      </div>
      </div>

      {/* ── Custom log modal ── */}
      {showCustom && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end"
          onClick={(e) => e.target === e.currentTarget && setShowCustom(false)}
        >
          <div className="w-full bg-card rounded-t-3xl border-t border-border/60 p-6 pb-10">
            <div className="w-10 h-1 rounded-full bg-border/60 mx-auto mb-5" />
            <h3 className="text-base font-bold text-foreground mb-4">Custom amount</h3>
            <div className="flex items-center bg-secondary border border-border/40 rounded-[14px] px-4 mb-4 h-14">
              <input
                type="number"
                placeholder="Enter ml"
                value={customMl}
                onChange={e => setCustomMl(e.target.value)}
                className="flex-1 bg-transparent text-foreground text-base font-semibold outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <span className="text-sm font-semibold text-muted-foreground">ml</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustom(false)}
                className="flex-1 h-12 rounded-[14px] bg-secondary border border-border/40 text-foreground font-semibold text-sm active:opacity-70 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomLog}
                disabled={logMetric.isPending}
                className="flex-[1.6] h-12 rounded-[14px] bg-primary text-primary-foreground font-bold text-sm active:opacity-90 transition-opacity"
              >
                {logMetric.isPending ? "Saving…" : "Log it"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
};

export default Hydration;
