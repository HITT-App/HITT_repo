import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Play, Pause, SkipForward, Flag, Waves, Bike, Footprints,
  Trophy, Lock, Unlock, Watch, ChevronRight, Check, Minus, Plus, Share2, Medal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { App as CapApp } from "@capacitor/app";
import { CompletionSummary } from "@/components/workout/CompletionSummary";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import LiveActivityMap from "@/components/activity/LiveActivityMap";
import { GpsFilter } from "@/lib/gps-filter";
import { startGpsWatch } from "@/lib/native-gps";
import type { GpsPoint } from "@/lib/gps-filter";
import { sendTriathlonToWatch, isWatchAvailable, startWorkoutMirroring, endWorkoutMirroring } from "@/plugins/WatchPlugin";
import { usePrimaryWearable } from "@/hooks/usePrimaryWearable";
import { WearableLaunchCard } from "@/components/wearable/WearableLaunchCard";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:      '#0a0a0a',
  card:    '#141414',
  sec:     '#1b1b1b',
  line:    '#262626',
  line2:   '#333333',
  fg:      '#fafafa',
  dim:     '#9a9a9a',
  dim2:    '#6f6f6f',
  dim3:    '#525252',
  primary: '#f97316',
  good:    '#4ade80',
  info:    '#38bdf8',
  gold:    '#F0B53C',
  mono:    "'SFMono-Regular',ui-monospace,Menlo,monospace" as string,
};

const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const fmt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const paceStr = (secs: number) =>
  `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`;

// ── Leg definitions ───────────────────────────────────────────
const LEGS = [
  { key: 'swim', label: 'Swim', Icon: Waves,      tone: C.info,    met: 8.0, gps: false, metric: 'pace100' as const, sub: 'Open-water swim', step: 0.05, dec: 2 },
  { key: 'bike', label: 'Bike', Icon: Bike,       tone: C.primary, met: 7.5, gps: true,  metric: 'speed'   as const, sub: 'Cycling',         step: 1,    dec: 0 },
  { key: 'run',  label: 'Run',  Icon: Footprints, tone: C.good,    met: 9.8, gps: true,  metric: 'pace'    as const, sub: 'Road run',        step: 0.1,  dec: 1 },
];

const PRESETS = [
  { label: 'Long Course',     short: 'Long',    d: [3.8, 180, 42.2] },
  { label: 'Middle Distance', short: 'Middle',  d: [1.9, 90,  21.1] },
  { label: 'Olympic',         short: 'Olympic', d: [1.5, 40,  10.0] },
  { label: 'Sprint',          short: 'Sprint',  d: [0.75, 20,  5.0] },
];
const ALL_PILLS = [...PRESETS, { label: 'Custom', short: 'Custom', d: null as number[] | null }];

interface LegData {
  elapsed: number;
  distance: number;
  calories: number;
  positions: GpsPoint[];
}

const weightKg = 75;

// ── Subcomponents ─────────────────────────────────────────────

function Stat({ value, unit, label, accent }: { value: string; unit?: string; label: string; accent?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: C.mono, color: accent || C.fg, letterSpacing: -0.4 }}>{value}</span>
        {unit && <span style={{ fontSize: 10, fontWeight: 600, color: C.dim2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: C.dim2, marginTop: 3, fontFamily: C.mono, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function LegStepper({ active, data }: { active: number; data: LegData[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', padding: '0 16px 12px', gap: 0 }}>
      {LEGS.map((leg, i) => {
        const isActive = i === active, isDone = i < active;
        return (
          <div key={leg.key} style={{ display: 'flex', alignItems: 'center', flex: isActive ? 1.5 : 1, transition: 'flex 0.4s', gap: 0 }}>
            <div style={{
              flex: 1, borderRadius: 14, padding: '11px 10px',
              border: `1px solid ${isActive ? tint(leg.tone, 0.4) : C.line}`,
              background: isActive ? tint(leg.tone, 0.1) : isDone ? C.card : 'transparent',
              opacity: !isActive && !isDone ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: isActive ? leg.tone : 'transparent',
                  border: isActive ? 'none' : `1px solid ${isDone ? tint(leg.tone, 0.5) : C.line2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone
                    ? <Check size={12} color={leg.tone} strokeWidth={2.6} />
                    : <leg.Icon size={13} color={isActive ? '#0a0a0a' : C.dim2} strokeWidth={isActive ? 2.6 : 2.2} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? C.fg : isDone ? C.dim : C.dim2 }}>{leg.label}</span>
                {isActive && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 99, background: leg.tone, boxShadow: `0 0 0 3px ${tint(leg.tone, 0.2)}` }} />}
              </div>
              {(isActive || isDone) && (
                <div style={{ fontSize: 11, fontFamily: C.mono, color: isActive ? C.dim : C.dim2, marginTop: 5 }}>
                  {fmt(data[i].elapsed)}
                </div>
              )}
            </div>
            {i < 2 && (
              <div style={{ width: 14, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <ChevronRight size={14} color={i < active ? LEGS[i].tone : C.dim3} strokeWidth={2.4} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SwimHero({ elapsed, distance, target }: { elapsed: number; distance: number; target: number }) {
  const pct = Math.min(distance / target, 1);
  return (
    <div style={{
      position: 'relative', flex: 1, minHeight: 0, borderRadius: 18, overflow: 'hidden',
      border: `1px solid ${C.line}`,
      background: `radial-gradient(120% 80% at 50% 30%, ${tint(C.info, 0.12)}, #0c0c0c 70%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        width: 84, height: 84, borderRadius: 99, background: tint(C.info, 0.14),
        border: `1px solid ${tint(C.info, 0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Waves size={38} color={C.info} strokeWidth={2} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 800, fontFamily: C.mono, color: C.fg, letterSpacing: -1, lineHeight: 1 }}>{fmt(elapsed)}</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.dim2, marginTop: 8, fontFamily: C.mono }}>TIMER MODE · NO GPS IN WATER</div>
      </div>
      <div style={{
        position: 'absolute', left: 12, right: 12, bottom: 12,
        background: 'rgba(0,0,0,0.4)', border: `1px solid ${C.line2}`, borderRadius: 13, padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.dim, whiteSpace: 'nowrap' }}>
            <b style={{ color: C.fg, fontFamily: C.mono }}>{distance.toFixed(2)}</b> / {target} km
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.info, fontFamily: C.mono }}>{Math.round(pct * 100)}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 4, background: C.sec, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: C.info, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
const Triathlon = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [screen, setScreen] = useState<'setup' | 'ready' | 'race' | 'finished'>('setup');
  const [showShare, setShowShare] = useState(false);
  const [activeLeg, setActiveLeg] = useState(0);
  const [running, setRunning] = useState(false);
  const [locked, setLocked] = useState(false);

  const [raceName, setRaceName] = useState('Long Course');
  const [targetKm, setTargetKm] = useState([3.8, 180, 42.2]);
  const [watchSent, setWatchSent] = useState(false);
  const [watchSending, setWatchSending] = useState(false);
  const { wearable: primaryWearable } = usePrimaryWearable();
  const [legData, setLegData] = useState<LegData[]>([
    { elapsed: 0, distance: 0, calories: 0, positions: [] },
    { elapsed: 0, distance: 0, calories: 0, positions: [] },
    { elapsed: 0, distance: 0, calories: 0, positions: [] },
  ]);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'active' | 'unavailable' | 'denied'>('searching');
  const [transitioning, setTransitioning] = useState(false);

  const gpsWatchRef = useRef<{ stop: () => void } | null>(null);
  const gpsFilterRef = useRef(new GpsFilter());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // Timer
  useEffect(() => {
    if (running && screen === 'race') {
      timerRef.current = setInterval(() => {
        setLegData((prev) => {
          const next = [...prev];
          const leg = { ...next[activeLeg] };
          leg.elapsed += 1;
          leg.calories = Math.round(LEGS[activeLeg].met * weightKg * (leg.elapsed / 3600));
          next[activeLeg] = leg;
          return next;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, activeLeg, screen]);

  // GPS for bike & run legs
  useEffect(() => {
    if (!running || !LEGS[activeLeg].gps || screen !== 'race') return;
    setGpsStatus('searching');
    gpsFilterRef.current.reset();
    let cancelled = false;

    startGpsWatch({
      onPosition: (pos) => {
        if (cancelled) return;
        const result = gpsFilterRef.current.process(pos.lat, pos.lng, pos.timestamp, pos.accuracy, pos.altitude);
        if (!result.accepted) return;
        setGpsStatus('active');
        setLegData((prev) => {
          const next = [...prev];
          const leg = { ...next[activeLeg] };
          leg.positions = [...leg.positions, result.point];
          if (result.distanceDelta > 0) leg.distance += result.distanceDelta / 1000;
          next[activeLeg] = leg;
          return next;
        });
      },
      onError: (code) => {
        if (cancelled) return;
        setGpsStatus(code === 'permission_denied' ? 'denied' : 'unavailable');
      },
    }).then((handle) => {
      if (cancelled) { handle.stop(); return; }
      gpsWatchRef.current = handle;
    });

    return () => {
      cancelled = true;
      gpsWatchRef.current?.stop();
      gpsWatchRef.current = null;
    };
  }, [running, activeLeg, screen]);

  const handleNextLeg = useCallback(() => {
    if (activeLeg >= 2) return;
    setRunning(false);
    gpsWatchRef.current?.stop();
    setTransitioning(true);
    setTimeout(() => {
      setActiveLeg((l) => l + 1);
      setTransitioning(false);
      setRunning(true);
    }, 1500);
  }, [activeLeg]);

  const handleFinish = useCallback(async () => {
    setRunning(false);
    setScreen('finished');
    gpsWatchRef.current?.stop();
    if (!user) return;
    const totals = legData.reduce(
      (acc, l) => ({ elapsed: acc.elapsed + l.elapsed, distance: acc.distance + l.distance, calories: acc.calories + l.calories }),
      { elapsed: 0, distance: 0, calories: 0 },
    );
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'Triathlon',
      started_at: startedAtRef.current,
      ended_at: new Date().toISOString(),
      duration_seconds: totals.elapsed,
      distance_km: Math.round(totals.distance * 100) / 100,
      calories_burned: totals.calories,
      status: 'completed',
      notes: `Swim: ${fmt(legData[0].elapsed)} | Bike: ${fmt(legData[1].elapsed)} ${legData[1].distance.toFixed(2)}km | Run: ${fmt(legData[2].elapsed)} ${legData[2].distance.toFixed(2)}km`,
    });
  }, [user, legData]);

  const sendToWatch = async () => {
    setWatchSending(true);
    let mirroring = false;
    let sendError: string | null = null;
    let mirrorError: string | null = null;

    // Surface the actual Capacitor bridge state up front — if the Watch plugin
    // isn't registered the user (and us) see the truth instead of "queued".
    const cap = (window as any).Capacitor;
    const diagBits: string[] = [];
    if (cap) {
      diagBits.push(`native=${cap.isNativePlatform?.() ?? '?'}`);
      diagBits.push(`watchAvail=${cap.isPluginAvailable?.('Watch') ?? '?'}`);
      diagBits.push(`pluginsKnown=${Object.keys(cap.Plugins ?? {}).join(',') || '(none)'}`);
    } else {
      diagBits.push('Capacitor=undefined');
    }

    try {
      await sendTriathlonToWatch({
        name: raceName,
        legs: [
          { type: 'swim', targetKm: targetKm[0] },
          { type: 'bike', targetKm: targetKm[1] },
          { type: 'run',  targetKm: targetKm[2] },
        ],
      });
    } catch (err: any) {
      sendError = err?.code ? `${err.code}: ${err.message ?? err}` : String(err?.message ?? err);
    }

    try {
      mirroring = await startWorkoutMirroring('triathlon', raceName);
    } catch (err: any) {
      mirrorError = err?.code ? `${err.code}: ${err.message ?? err}` : String(err?.message ?? err);
    }

    setWatchSent(true);
    setWatchSending(false);

    if (sendError || mirrorError) {
      toast({
        variant: 'destructive',
        title: 'Watch send FAILED — diagnostics:',
        description: `${diagBits.join(' · ')}${sendError ? ` · sendErr=${sendError}` : ''}${mirrorError ? ` · mirrorErr=${mirrorError}` : ''}`,
      });
      return;
    }

    if (mirroring) {
      toast({ title: 'Starting on Apple Watch ⌚', description: `Tap the prompt on your Watch to open the Race screen. ${diagBits.join(' · ')}` });
      setTimeout(() => endWorkoutMirroring(), 8000);
    } else {
      const reachable = await isWatchAvailable().catch(() => false);
      if (reachable) {
        toast({ title: 'Plan sent to Watch ⌚', description: `Open the Race screen on your Watch to begin. ${diagBits.join(' · ')}` });
      } else {
        toast({ title: 'Plan queued for Watch ⌚', description: `Open the HIIT app on your Watch. ${diagBits.join(' · ')}` });
      }
    }
  };

  const totals = legData.reduce(
    (acc, l) => ({ elapsed: acc.elapsed + l.elapsed, distance: acc.distance + l.distance, calories: acc.calories + l.calories }),
    { elapsed: 0, distance: 0, calories: 0 },
  );

  const isCustom = raceName === 'Custom';

  const adjust = (i: number, dir: number) => {
    setRaceName('Custom');
    setTargetKm((prev) => {
      const n = [...prev];
      const step = LEGS[i].step;
      n[i] = Math.max(step, +((parseFloat(String(n[i])) + dir * step).toFixed(LEGS[i].dec)));
      return n;
    });
  };

  // ── SETUP ────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', color: C.fg }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 12px',
          paddingTop: 'calc(var(--safe-area-inset-top, 44px) + 8px)', flexShrink: 0,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >
            <ArrowLeft size={18} color={C.fg} strokeWidth={2.2} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 750, color: C.fg, letterSpacing: -0.2 }}>Triathlon Setup</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Race type pills */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: C.dim2, marginBottom: 10, textTransform: 'uppercase', fontFamily: C.mono }}>Race type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ALL_PILLS.map((p) => {
                const on = raceName === p.label;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setRaceName(p.label); if (p.d) setTargetKm([...p.d]); }}
                    style={{
                      flex: 1, cursor: 'pointer', borderRadius: 11, padding: '9px 0',
                      border: `1px solid ${on ? tint(C.primary, 0.34) : C.line}`,
                      background: on ? tint(C.primary, 0.13) : C.card,
                      color: on ? C.primary : C.dim2,
                      fontSize: 11.5, fontWeight: 700, WebkitTapHighlightColor: 'transparent',
                    }}
                  >{p.short}</button>
                );
              })}
            </div>
          </div>

          {/* Target distances */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: C.dim2, marginBottom: 10, textTransform: 'uppercase', fontFamily: C.mono }}>Target distances</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {LEGS.map((leg, i) => (
                <div key={leg.key} style={{
                  display: 'flex', alignItems: 'center', gap: 13, background: C.card,
                  border: `1px solid ${C.line}`, borderRadius: 16, padding: '13px 14px',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: tint(leg.tone, 0.12), border: `1px solid ${tint(leg.tone, 0.3)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <leg.Icon size={20} color={leg.tone} strokeWidth={2.1} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.fg }}>{leg.label}</div>
                    <div style={{ fontSize: 11, color: C.dim2, marginTop: 1 }}>{leg.sub}</div>
                  </div>
                  {isCustom ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => adjust(i, -1)} style={{ width: 32, height: 32, borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.line2}`, background: C.sec, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
                        <Minus size={15} color={C.fg} strokeWidth={2.4} />
                      </button>
                      <span style={{ fontSize: 19, fontWeight: 750, fontFamily: C.mono, color: C.fg, minWidth: 54, textAlign: 'center' }}>
                        {Number(targetKm[i]).toFixed(leg.dec)}
                      </span>
                      <button onClick={() => adjust(i, 1)} style={{ width: 32, height: 32, borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.line2}`, background: C.sec, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
                        <Plus size={15} color={C.fg} strokeWidth={2.4} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 750, fontFamily: C.mono, color: C.fg, letterSpacing: -0.5 }}>{targetKm[i]}</span>
                      <span style={{ fontSize: 11, color: C.dim2, fontFamily: C.mono }}>km</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total + composition bar */}
          <div style={{ background: C.sec, border: `1px solid ${C.line}`, borderRadius: 14, padding: '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: C.dim2, fontFamily: C.mono, textTransform: 'uppercase' }}>Total distance</span>
              <span style={{ fontSize: 16, fontWeight: 750, fontFamily: C.mono, color: C.fg }}>
                {(targetKm[0] + targetKm[1] + targetKm[2]).toFixed(1)} <span style={{ fontSize: 11, color: C.dim2 }}>km</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 3, height: 7 }}>
              {LEGS.map((leg, i) => (
                <div key={leg.key} style={{ flex: Math.max(targetKm[i], 0.01), background: leg.tone, borderRadius: 3, minWidth: 7, opacity: 0.9 }} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            <WearableLaunchCard
              wearable={primaryWearable}
              activityType="triathlon"
              tokens={C}
              tint={tint}
              onLaunchAppleWatch={sendToWatch}
              watchLaunching={watchSending}
              watchLaunched={watchSent}
            />
            <button
              onClick={() => setScreen('ready')}
              style={{
                width: '100%', height: 54, borderRadius: 16, cursor: 'pointer', border: 'none',
                background: C.primary, color: '#0a0a0a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                fontSize: 15.5, fontWeight: 750, whiteSpace: 'nowrap',
                boxShadow: `0 6px 20px ${tint(C.primary, 0.32)}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Play size={18} color="#0a0a0a" strokeWidth={2.6} style={{ marginLeft: 3 }} /> Start race
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── READY ────────────────────────────────────────────────────
  if (screen === 'ready') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: C.bg, display: 'flex', flexDirection: 'column', color: C.fg, paddingTop: 'calc(var(--safe-area-inset-top, 44px) + 8px)', paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 32px)' }}>
        <div style={{ padding: '0 16px 8px' }}>
          <button onClick={() => setScreen('setup')} style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <ArrowLeft size={18} color={C.fg} strokeWidth={2.2} />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 32px' }}>
          <div style={{ width: 88, height: 88, borderRadius: 26, background: tint(C.gold, 0.14), border: `1px solid ${tint(C.gold, 0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Medal size={40} color={C.gold} strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.fg, letterSpacing: -0.5, margin: 0 }}>Triathlon</h1>
            <p style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>{raceName} · {(targetKm[0] + targetKm[1] + targetKm[2]).toFixed(1)} km</p>
          </div>
        </div>
        <div style={{ padding: '0 16px' }}>
          <button
            onClick={() => { startedAtRef.current = new Date().toISOString(); setRunning(true); setScreen('race'); }}
            style={{ width: '100%', height: 60, borderRadius: 18, background: C.primary, border: 'none', color: '#0a0a0a', fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: `0 6px 20px ${tint(C.primary, 0.32)}`, WebkitTapHighlightColor: 'transparent' }}
          >
            Ready?
          </button>
        </div>
      </div>
    );
  }

  // ── RACE ─────────────────────────────────────────────────────
  if (screen === 'race') {
    const leg = LEGS[activeLeg];
    const d = legData[activeLeg];

    let metricValue: string, metricUnit: string, metricLabel: string;
    if (leg.metric === 'speed') {
      const spd = d.elapsed > 0 && d.distance > 0 ? d.distance / (d.elapsed / 3600) : 0;
      metricValue = spd > 0 ? spd.toFixed(1) : '—';
      metricUnit = 'km/h'; metricLabel = 'SPEED';
    } else if (leg.metric === 'pace') {
      const p = d.distance > 0 ? d.elapsed / d.distance : 0;
      metricValue = p > 0 ? paceStr(p) : '—';
      metricUnit = '/km'; metricLabel = 'PACE';
    } else {
      const p = d.distance > 0 ? d.elapsed / (d.distance * 10) : 0;
      metricValue = p > 0 ? paceStr(p) : '—';
      metricUnit = '/100m'; metricLabel = 'PACE';
    }

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: C.bg, color: C.fg }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 12px',
          paddingTop: 'calc(var(--safe-area-inset-top, 44px) + 8px)', flexShrink: 0,
        }}>
          <button
            onClick={() => { setRunning(false); setScreen('setup'); }}
            style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >
            <ArrowLeft size={18} color={C.fg} strokeWidth={2.2} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.6, color: C.dim2, fontFamily: C.mono }}>
              {raceName.toUpperCase()} · LEG {activeLeg + 1}/3
            </div>
            <div style={{ fontSize: 18, fontWeight: 750, color: C.fg, letterSpacing: -0.2 }}>{leg.label} leg</div>
          </div>
          <button
            onClick={() => setLocked((l) => !l)}
            style={{
              width: 38, height: 38, borderRadius: 99, cursor: 'pointer', flexShrink: 0,
              border: `1px solid ${locked ? tint(leg.tone, 0.4) : C.line}`,
              background: locked ? tint(leg.tone, 0.12) : C.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {locked
              ? <Lock size={16} color={leg.tone} strokeWidth={2.2} />
              : <Unlock size={16} color={C.dim} strokeWidth={2.2} />}
          </button>
        </div>

        <LegStepper active={activeLeg} data={legData} />

        {/* Hero */}
        <div style={{ flex: 1, minHeight: 180, padding: '0 16px', display: 'flex', position: 'relative' }}>
          {leg.gps ? (
            <div style={{ flex: 1, position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.line}` }}>
              <LiveActivityMap positions={d.positions} gpsStatus={gpsStatus} />

              {/* GPS denied overlay */}
              {gpsStatus === 'denied' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px', textAlign: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.2)' }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.fg, marginBottom: 4 }}>Location access denied</div>
                    <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>Enable location in Settings to track this leg.</div>
                  </div>
                  <button
                    onClick={() => CapApp.openUrl({ url: 'app-settings:' }).catch(() => {})}
                    style={{ padding: '10px 24px', borderRadius: 12, background: '#ef4444', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  >
                    Open Settings
                  </button>
                </div>
              )}

              {/* LIVE / searching badge */}
              {gpsStatus !== 'denied' && (
                <div style={{
                  position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'rgba(0,0,0,0.55)', border: `1px solid ${C.line2}`, backdropFilter: 'blur(8px)',
                  borderRadius: 99, padding: '5px 10px 5px 8px', zIndex: 10,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: gpsStatus === 'active' ? C.good : '#facc15', boxShadow: `0 0 0 3px ${tint(gpsStatus === 'active' ? C.good : '#facc15', 0.2)}` }} />
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: C.mono, letterSpacing: 1, color: C.fg }}>{gpsStatus === 'active' ? 'LIVE · GPS' : 'SEARCHING…'}</span>
                </div>
              )}

              {/* Progress overlay */}
              <div style={{
                position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 10,
                background: 'rgba(0,0,0,0.5)', border: `1px solid ${C.line2}`, backdropFilter: 'blur(8px)',
                borderRadius: 13, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.dim, whiteSpace: 'nowrap' }}>
                    <b style={{ color: C.fg, fontFamily: C.mono }}>{d.distance.toFixed(2)}</b> / {targetKm[activeLeg]} km
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: leg.tone, fontFamily: C.mono }}>
                    {Math.round(Math.min(d.distance / targetKm[activeLeg], 1) * 100)}%
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 4, background: C.sec, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(d.distance / targetKm[activeLeg], 1) * 100}%`, background: leg.tone, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          ) : (
            <SwimHero elapsed={d.elapsed} distance={d.distance} target={targetKm[0]} />
          )}

          {/* Transition overlay */}
          {transitioning && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 18 }}>
              {activeLeg < 2 && (() => { const NL = LEGS[activeLeg + 1]; return (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: 99, background: tint(NL.tone, 0.14), border: `1px solid ${tint(NL.tone, 0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <NL.Icon size={28} color={NL.tone} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.fg }}>Moving to {NL.label}…</div>
                </>
              ); })()}
            </div>
          )}
        </div>

        {/* Stats + controls */}
        <div style={{ padding: '14px 16px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 8px', marginBottom: 12 }}>
            <Stat value={fmt(d.elapsed)} label="DURATION" />
            <div style={{ width: 1, height: 30, background: C.line }} />
            <Stat value={d.distance.toFixed(2)} unit="km" label="DISTANCE" />
            <div style={{ width: 1, height: 30, background: C.line }} />
            <Stat value={metricValue} unit={metricUnit} label={metricLabel} accent={leg.tone} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
            background: C.sec, border: `1px solid ${C.line}`, borderRadius: 12, padding: '9px 14px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 750, letterSpacing: 1, color: C.dim2, fontFamily: C.mono }}>RACE TOTAL</span>
            <span style={{ fontSize: 12, fontFamily: C.mono, color: C.fg }}>{fmt(totals.elapsed)}</span>
            <span style={{ fontSize: 12, fontFamily: C.mono, color: C.dim }}>{totals.distance.toFixed(1)} km</span>
            <span style={{ fontSize: 12, fontFamily: C.mono, color: C.dim }}>{totals.calories.toLocaleString()} kcal</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: locked ? 0.35 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
            <button
              onClick={() => setRunning((r) => !r)}
              style={{
                width: 60, height: 60, borderRadius: 99, flexShrink: 0, cursor: 'pointer', border: 'none',
                background: running ? C.card : leg.tone,
                boxShadow: running ? `inset 0 0 0 1px ${C.line2}` : `0 6px 20px ${tint(leg.tone, 0.35)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {running
                ? <Pause size={24} color={C.fg} strokeWidth={2.4} />
                : <Play size={24} color="#0a0a0a" strokeWidth={2.4} style={{ marginLeft: 3 }} />}
            </button>

            {activeLeg < 2 ? (
              <button
                onClick={handleNextLeg}
                style={{
                  flex: 1, height: 60, borderRadius: 18, cursor: 'pointer',
                  border: `1px solid ${C.line2}`, background: C.card, color: C.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  fontSize: 14.5, fontWeight: 700, WebkitTapHighlightColor: 'transparent',
                }}
              >
                <SkipForward size={18} color={C.fg} strokeWidth={2.2} />
                Next · {LEGS[activeLeg + 1].label}
                {(() => { const NL = LEGS[activeLeg + 1]; return <NL.Icon size={16} color={NL.tone} strokeWidth={2.2} />; })()}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                style={{
                  flex: 1, height: 60, borderRadius: 18, cursor: 'pointer', border: 'none',
                  background: C.primary, color: '#0a0a0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  fontSize: 14.5, fontWeight: 750,
                  boxShadow: `0 6px 20px ${tint(C.primary, 0.32)}`, WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Flag size={18} color="#0a0a0a" strokeWidth={2.4} /> Finish race
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── FINISHED ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.fg, display: 'flex', flexDirection: 'column' }}>
      {showShare && (
        <CompletionSummary
          activityTitle={`${raceName === 'Custom' ? 'Custom' : raceName} Triathlon`}
          activityType="triathlon"
          stats={[
            { label: 'Duration', value: fmt(totals.elapsed) },
            { label: 'Distance', value: totals.distance.toFixed(1), unit: 'km' },
            { label: 'Calories', value: String(totals.calories), unit: 'kcal' },
          ]}
          onDone={() => setShowShare(false)}
        />
      )}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div style={{ padding: 'calc(var(--safe-area-inset-top, 44px) + 26px) 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hero */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 99, margin: '0 auto 16px', background: tint(C.primary, 0.13), border: `1px solid ${tint(C.primary, 0.34)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={32} color={C.primary} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 750, letterSpacing: 1.6, color: C.dim2, fontFamily: C.mono }}>{raceName.toUpperCase()} · COMPLETE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.fg, marginTop: 4, letterSpacing: -0.4 }}>Triathlon finished</div>
          </div>

          {/* Total */}
          <div style={{ background: `linear-gradient(180deg, ${tint(C.primary, 0.08)}, ${tint(C.primary, 0.02)})`, border: `1px solid ${tint(C.primary, 0.34)}`, borderRadius: 18, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 750, letterSpacing: 1.6, color: C.primary, fontFamily: C.mono }}>FINISH TIME</div>
            <div style={{ fontSize: 44, fontWeight: 800, fontFamily: C.mono, color: C.fg, letterSpacing: -1.5, margin: '4px 0 8px' }}>{fmt(totals.elapsed)}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
              <span style={{ fontSize: 13, fontFamily: C.mono, color: C.dim }}>{totals.distance.toFixed(1)} km</span>
              <span style={{ fontSize: 13, fontFamily: C.mono, color: C.dim }}>{totals.calories.toLocaleString()} kcal</span>
            </div>
          </div>

          {/* Leg breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LEGS.map((leg, i) => {
              const x = legData[i];
              return (
                <div key={leg.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '13px 14px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: tint(leg.tone, 0.12), border: `1px solid ${tint(leg.tone, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <leg.Icon size={17} color={leg.tone} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.fg }}>{leg.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, fontFamily: C.mono, color: C.fg }}>{fmt(x.elapsed)}</span>
                  <span style={{ fontSize: 11, color: C.dim2, fontFamily: C.mono, width: 58, textAlign: 'right' }}>{x.distance.toFixed(1)} km</span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowShare(true)}
              style={{ flex: 1, cursor: 'pointer', borderRadius: 14, padding: '13px 0', border: `1px solid ${C.line2}`, background: C.card, color: C.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13.5, fontWeight: 650, WebkitTapHighlightColor: 'transparent' }}
            >
              <Share2 size={15} color={C.fg} strokeWidth={2.1} /> Share
            </button>
            <button
              onClick={() => navigate('/')}
              style={{ flex: 1.6, cursor: 'pointer', borderRadius: 14, padding: '13px 0', border: 'none', background: C.fg, color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13.5, fontWeight: 750, WebkitTapHighlightColor: 'transparent' }}
            >
              <Check size={16} color="#0a0a0a" strokeWidth={2.6} /> Save to history
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Triathlon;
