import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Play, Pause, SkipForward, Flag, Waves, Bike, Footprints, Trophy, Lock, Unlock, Watch, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import LiveActivityMap from "@/components/activity/LiveActivityMap";
import { GpsFilter } from "@/lib/gps-filter";
import { startGpsWatch } from "@/lib/native-gps";
import type { GpsPoint } from "@/lib/gps-filter";
import { sendTriathlonToWatch } from "@/plugins/WatchPlugin";

interface LegData {
  elapsed: number;
  distance: number;
  calories: number;
  positions: GpsPoint[];
}

const LEGS = [
  { key: "swim", label: "Swim", icon: Waves, color: "from-blue-500 to-blue-600", met: 8.0, gps: false },
  { key: "bike", label: "Bike", icon: Bike, color: "from-cyan-500 to-cyan-600", met: 7.5, gps: true },
  { key: "run", label: "Run", icon: Footprints, color: "from-green-500 to-green-600", met: 9.8, gps: true },
] as const;

const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const PRESETS = [
  { label: "Long Course",    distances: [3.8, 180, 42.2] },
  { label: "Middle Distance", distances: [1.9, 90,  21.1] },
  { label: "Olympic",       distances: [1.5, 40,  10.0] },
  { label: "Sprint",        distances: [0.75, 20,  5.0] },
  { label: "Custom",        distances: null },
] as const;

const Triathlon = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeLeg, setActiveLeg] = useState(0);
  const [running, setRunning] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  // Race setup
  const [targetKm, setTargetKm] = useState([3.8, 180, 42.2]);
  const [raceName, setRaceName] = useState("Long Course");
  const [showSetup, setShowSetup] = useState(true);
  const [watchSent, setWatchSent] = useState(false);
  const [watchSending, setWatchSending] = useState(false);
  const [legData, setLegData] = useState<LegData[]>([
    { elapsed: 0, distance: 0, calories: 0, positions: [] },
    { elapsed: 0, distance: 0, calories: 0, positions: [] },
    { elapsed: 0, distance: 0, calories: 0, positions: [] },
  ]);
  const [gpsStatus, setGpsStatus] = useState<"searching" | "active" | "unavailable" | "denied">("searching");
  const [transitioning, setTransitioning] = useState(false);

  const gpsWatchRef = useRef<{ stop: () => void } | null>(null);
  const gpsFilterRef = useRef(new GpsFilter());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const weightKg = 75; // fallback

  // Timer
  useEffect(() => {
    if (running && !finished) {
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
  }, [running, activeLeg, finished]);

  // GPS for bike & run legs (Kalman-filtered, native-capable)
  useEffect(() => {
    if (!running || !LEGS[activeLeg].gps) return;

    setGpsStatus("searching");
    gpsFilterRef.current.reset();
    let cancelled = false;

    startGpsWatch({
      onPosition: (pos) => {
        if (cancelled) return;
        const result = gpsFilterRef.current.process(
          pos.lat, pos.lng, pos.timestamp, pos.accuracy, pos.altitude,
        );
        if (!result.accepted) return;

        setGpsStatus("active");
        setLegData((prev) => {
          const next = [...prev];
          const leg = { ...next[activeLeg] };
          leg.positions = [...leg.positions, result.point];
          if (result.distanceDelta > 0) {
            leg.distance += result.distanceDelta / 1000; // convert m to km
          }
          next[activeLeg] = leg;
          return next;
        });
      },
      onError: (code) => {
        if (cancelled) return;
        setGpsStatus(code === "permission_denied" ? "denied" : "unavailable");
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
  }, [running, activeLeg]);

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
    setFinished(true);
    gpsWatchRef.current?.stop();

    if (!user) return;
    const totals = legData.reduce(
      (acc, l) => ({ elapsed: acc.elapsed + l.elapsed, distance: acc.distance + l.distance, calories: acc.calories + l.calories }),
      { elapsed: 0, distance: 0, calories: 0 }
    );

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: "Triathlon",
      started_at: startedAtRef.current,
      ended_at: new Date().toISOString(),
      duration_seconds: totals.elapsed,
      distance_km: Math.round(totals.distance * 100) / 100,
      calories_burned: totals.calories,
      status: "completed",
      notes: `Swim: ${fmt(legData[0].elapsed)} | Bike: ${fmt(legData[1].elapsed)} ${legData[1].distance.toFixed(2)}km | Run: ${fmt(legData[2].elapsed)} ${legData[2].distance.toFixed(2)}km`,
    });

    toast({ title: "🏆 Triathlon Complete!", description: `Total: ${fmt(totals.elapsed)} • ${totals.distance.toFixed(2)} km • ${totals.calories} kcal` });
  }, [user, legData]);

  const totals = legData.reduce(
    (acc, l) => ({ elapsed: acc.elapsed + l.elapsed, distance: acc.distance + l.distance, calories: acc.calories + l.calories }),
    { elapsed: 0, distance: 0, calories: 0 }
  );

  const currentLeg = LEGS[activeLeg];
  const CurrentIcon = currentLeg.icon;

  // ── Finished Screen ──
  if (finished) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
            <Trophy size={36} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Triathlon Complete</h1>

          <div className="w-full max-w-sm space-y-3">
            {LEGS.map((leg, i) => {
              const Icon = leg.icon;
              const d = legData[i];
              return (
                <div key={leg.key} className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${leg.color} flex items-center justify-center`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-foreground">{leg.label}</span>
                    <span className="ml-auto font-mono text-sm text-muted-foreground">{fmt(d.elapsed)}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{d.distance.toFixed(2)} km</span>
                    <span>{d.calories} kcal</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 w-full max-w-sm">
            <div className="text-center">
              <p className="text-xs text-yellow-500 font-bold tracking-wider mb-1">TOTAL</p>
              <p className="text-3xl font-black text-foreground font-mono">{fmt(totals.elapsed)}</p>
              <div className="flex justify-center gap-6 mt-2 text-sm text-muted-foreground">
                <span>{totals.distance.toFixed(2)} km</span>
                <span>{totals.calories} kcal</span>
              </div>
            </div>
          </div>

          <Button onClick={() => navigate("/")} className="w-full max-w-sm bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold hover:from-yellow-400 hover:to-amber-500">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Scroll to top whenever setup screen is shown
  useEffect(() => { window.scrollTo(0, 0); }, [showSetup]);

  const sendToWatch = async () => {
    setWatchSending(true);
    try {
      await sendTriathlonToWatch({
        name: raceName,
        legs: [
          { type: "swim", targetKm: targetKm[0] },
          { type: "bike", targetKm: targetKm[1] },
          { type: "run",  targetKm: targetKm[2] },
        ],
      });
    } catch { /* best-effort — plan delivered via applicationContext when Watch app opens */ }
    setWatchSent(true);
    setWatchSending(false);
    toast({ title: "Plan sent to Watch ⌚", description: "Your Watch will open the Race screen automatically." });
  };

  // Setup screen shown before race starts
  if (showSetup) {

    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 pb-2 sticky top-0 z-10 bg-background" style={{ paddingTop: "calc(var(--safe-area-inset-top, 44px) + 0.5rem)" }}>
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
            <Home size={18} />
          </button>
          <h1 className="text-sm font-bold flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" /> RACE SETUP
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* Preset selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider uppercase">Race Type</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setRaceName(p.label);
                    if (p.distances) setTargetKm([...p.distances]);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    raceName === p.label
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <p className="text-xs font-bold">{p.label}</p>
                  {p.distances && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.distances[0]}km / {p.distances[1]}km / {p.distances[2]}km
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Distance editors */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider uppercase">Target Distances</p>
            <div className="space-y-2">
              {[
                { label: "Swim", icon: Waves, color: "text-blue-400" },
                { label: "Bike", icon: Bike,  color: "text-cyan-400" },
                { label: "Run",  icon: Footprints, color: "text-green-400" },
              ].map(({ label, icon: Icon, color }, i) => (
                <div key={label} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                  <Icon size={18} className={color} />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={targetKm[i]}
                    readOnly={raceName !== "Custom"}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setTargetKm((prev) => { const n = [...prev]; n[i] = v; return n; });
                    }}
                    className={`w-20 text-right border rounded-lg px-2 py-1 text-sm font-mono transition-colors ${
                      raceName === "Custom"
                        ? "bg-secondary border-border"
                        : "bg-muted border-transparent text-muted-foreground cursor-default"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">km</span>
                </div>
              ))}
            </div>
          </div>

          {/* Send to Watch */}
          <Button
            variant="outline"
            className="w-full gap-2 active:scale-95 active:bg-secondary transition-all"
            onClick={sendToWatch}
            disabled={watchSending}
          >
            <Watch size={16} className={watchSent ? "text-green-500" : "text-muted-foreground"} />
            {watchSending ? "Sending…" : watchSent ? "Sent to Watch ✓" : "Send Plan to Apple Watch"}
          </Button>

          {/* Start */}
          <Button
            className="w-full h-12 gap-2 bg-primary text-primary-foreground rounded-xl"
            onClick={() => setShowSetup(false)}
          >
            <Play size={16} /> Start Race
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative">
      {/* Header */}
      <div className="relative z-10 px-4 pb-2 flex items-center gap-3" style={{ paddingTop: "calc(var(--safe-area-inset-top, 44px) + 0.5rem)" }}>
        <button onClick={() => setShowSetup(true)} className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border/30 flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" /> {raceName.toUpperCase()}
          </h1>
        </div>
        <button
          onClick={() => setLocked(!locked)}
          className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border/30 flex items-center justify-center"
        >
          {locked ? <Lock size={16} className="text-yellow-500" /> : <Unlock size={16} className="text-muted-foreground" />}
        </button>
      </div>

      {/* Leg progress indicator */}
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          {LEGS.map((leg, i) => {
            const Icon = leg.icon;
            const isActive = i === activeLeg;
            const isDone = i < activeLeg;
            return (
              <div
                key={leg.key}
                className={`flex-1 rounded-xl p-2.5 transition-all duration-500 ${
                  isActive
                    ? `bg-gradient-to-br ${leg.color} shadow-lg`
                    : isDone
                    ? "bg-card/60 border border-border/30"
                    : "bg-card/30 border border-border/20 opacity-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={isActive ? "text-white" : isDone ? "text-green-400" : "text-muted-foreground"} />
                  <span className={`text-xs font-bold ${isActive ? "text-white" : isDone ? "text-green-400" : "text-muted-foreground"}`}>
                    {leg.label}
                  </span>
                </div>
                {(isActive || isDone) && (
                  <p className={`text-[10px] font-mono mt-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                    {fmt(legData[i].elapsed)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Map / Timer area */}
      <div className="flex-1 relative">
        {currentLeg.gps ? (
          <LiveActivityMap positions={legData[activeLeg].positions} gpsStatus={gpsStatus} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-950/50 to-background gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse">
              <Waves size={40} className="text-white" />
            </div>
            <p className="text-muted-foreground text-sm">Timer mode – GPS not used in water</p>
          </div>
        )}

        {/* Transition overlay */}
        {transitioning && (
          <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center gap-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${LEGS[activeLeg + 1]?.color || ""} flex items-center justify-center shadow-xl animate-bounce`}>
              {activeLeg < 2 && (() => { const NI = LEGS[activeLeg + 1].icon; return <NI size={28} className="text-white" />; })()}
            </div>
            <p className="text-lg font-bold text-foreground">Transitioning to {LEGS[activeLeg + 1]?.label}…</p>
          </div>
        )}
      </div>

      {/* Bottom stats & controls */}
      <div className="relative z-10 bg-card/80 backdrop-blur-xl border-t border-border/30 px-4 pb-6 pt-4">
        {/* Current leg stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-black text-foreground font-mono">{fmt(legData[activeLeg].elapsed)}</p>
            <p className="text-[10px] text-muted-foreground font-bold tracking-wider">DURATION</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-foreground font-mono">{legData[activeLeg].distance.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-bold tracking-wider">KM</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-foreground font-mono">{legData[activeLeg].calories}</p>
            <p className="text-[10px] text-muted-foreground font-bold tracking-wider">KCAL</p>
          </div>
        </div>

        {/* Total bar */}
        <div className="flex items-center justify-between bg-yellow-500/10 rounded-xl px-3 py-2 mb-4 border border-yellow-500/20">
          <span className="text-[10px] font-bold text-yellow-500 tracking-wider">TOTAL</span>
          <span className="text-xs font-mono text-foreground">{fmt(totals.elapsed)}</span>
          <span className="text-xs font-mono text-foreground">{totals.distance.toFixed(2)} km</span>
          <span className="text-xs font-mono text-foreground">{totals.calories} kcal</span>
        </div>

        {/* Controls */}
        <div className={`flex items-center justify-center gap-4 ${locked ? "opacity-30 pointer-events-none" : ""}`}>
          <button
            onClick={() => setRunning(!running)}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${
              running
                ? "bg-gradient-to-br from-yellow-500 to-amber-600"
                : `bg-gradient-to-br ${currentLeg.color}`
            }`}
          >
            {running ? <Pause size={28} className="text-black" /> : <Play size={28} className="text-white ml-1" />}
          </button>

          {running && activeLeg < 2 && (
            <button
              onClick={handleNextLeg}
              className="h-14 px-5 rounded-full bg-card/80 backdrop-blur-xl border border-border/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <SkipForward size={18} className="text-foreground" />
              <span className="text-sm font-bold text-foreground">Next: {LEGS[activeLeg + 1].label}</span>
            </button>
          )}

          {running && activeLeg === 2 && (
            <button
              onClick={handleFinish}
              className="h-14 px-5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-yellow-500/25"
            >
              <Flag size={18} className="text-black" />
              <span className="text-sm font-bold text-black">Finish</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Triathlon;
