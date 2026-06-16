import { useState, useEffect } from "react";
import {
  Home, Plus, Calendar, Users, Bot, Search, Bell,
  Upload, Activity, Target, Clock, Apple, UtensilsCrossed,
  Droplets, Camera, ScanLine, Barcode, Gauge, Footprints,
  Scale, Moon, Smile, MessageCircle, Trophy, BarChart3,
  User, ChevronRight, Crosshair,
} from "lucide-react";

const ORANGE = "hsl(24 95% 50%)";

const STEPS = [
  {
    id: "stats",
    title: "Your home dashboard",
    desc: "Your week at a glance — calories, workouts, minutes and active days. Scroll down for your Body Scan, next workout and health metrics.",
    side: "below" as const,
    pad: 8,
    radius: 20,
  },
  {
    id: "nav",
    title: "Your tab bar",
    desc: "Get around from here: Home, Quick Add to log an activity fast, Schedule and Social.",
    side: "above" as const,
    pad: 0,
    radius: 0,
  },
  {
    id: "hiit-logo",
    title: "Tap the HIIT logo for everything",
    desc: "The centre button opens your full menu — pick a sport, plus Fitness, Nutrition, Scanners, Health, Community and your Account.",
    side: "menu" as const,
    pad: 6,
    radius: 999,
  },
  {
    id: "fab",
    title: "Meet HIIT AI",
    desc: "Tap the chat button any time for your AI coach — ask for workouts, recipes, form tips and a little motivation.",
    side: "above" as const,
    pad: 6,
    radius: 999,
  },
  {
    id: "body-scan",
    title: "Track your progress",
    desc: "Run an AI Body Scan to map your physique and personalise your plan as you improve.",
    side: "below" as const,
    pad: 6,
    radius: 20,
  },
  {
    id: "avatar",
    title: "Your profile lives up here",
    desc: "Tap your avatar for your profile, HIIT Score and settings. That's the tour — you're all set!",
    side: "below" as const,
    pad: 6,
    radius: 999,
  },
] as const;

type Rect = { top: number; left: number; width: number; height: number };

// ── HIIT menu mock shown on step 3 ──────────────────────────────
const MENU_GROUPS = [
  { group: "Main", items: [
    { Icon: Home, label: "Home" }, { Icon: Bot, label: "HIIT AI Coach" },
    { Icon: Search, label: "Search" }, { Icon: Bell, label: "Notifications" },
  ]},
  { group: "Fitness", items: [
    { Icon: Calendar, label: "Schedule" }, { Icon: Upload, label: "Import Plan" },
    { Icon: Activity, label: "Activity" }, { Icon: Target, label: "Goals" },
    { Icon: Clock, label: "History" },
  ]},
  { group: "Nutrition", items: [
    { Icon: Apple, label: "Nutrition" }, { Icon: UtensilsCrossed, label: "Meals" },
    { Icon: Droplets, label: "Hydration" },
  ]},
  { group: "Scanners", items: [
    { Icon: Camera, label: "Meal Scanner" }, { Icon: ScanLine, label: "Body Scanner" },
    { Icon: Barcode, label: "Barcode Scanner" },
  ]},
  { group: "Health", items: [
    { Icon: Gauge, label: "Heart Rate" }, { Icon: Footprints, label: "Steps" },
    { Icon: Scale, label: "Weight" }, { Icon: Moon, label: "Sleep" },
    { Icon: Smile, label: "Mood" },
  ]},
  { group: "Community", items: [
    { Icon: MessageCircle, label: "Community" }, { Icon: Trophy, label: "Achievements" },
    { Icon: BarChart3, label: "Leaderboard" },
  ]},
  { group: "Account", items: [
    { Icon: User, label: "Profile" },
  ]},
];

function HIITMenuMock() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "82%",
        background: "hsl(var(--background))",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTop: "1px solid hsl(var(--border))",
        borderLeft: "1px solid hsl(var(--border))",
        borderRight: "1px solid hsl(var(--border))",
        overflow: "hidden",
        boxShadow: "0 -20px 50px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        animation: "tutSheetUp 0.4s cubic-bezier(0.2,0.7,0.2,1) both",
      }}
    >
      {/* Drag handle */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "hsl(var(--border))" }} />
      </div>

      {/* Header */}
      <div style={{ padding: "12px 20px 14px" }}>
        <p style={{ fontSize: 19, fontWeight: 800, color: "hsl(var(--foreground))", margin: 0 }}>HIIT Menu</p>
        {/* Choose a Sport */}
        <button
          style={{
            marginTop: 12, width: "100%", borderRadius: 16, padding: "14px 16px",
            background: `linear-gradient(120deg, ${ORANGE}, hsl(24 85% 42%))`,
            display: "flex", alignItems: "center", gap: 12, border: 0, cursor: "default",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.25)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <Crosshair size={22} color="#fff" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1a0a00" }}>Choose a Sport</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(26,10,0,0.7)", marginTop: 2 }}>
              Start a guided session now
            </p>
          </div>
          <ChevronRight size={18} color="#fff" />
        </button>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 28px" }}>
        {MENU_GROUPS.map((g) => (
          <div key={g.group} style={{ marginTop: 16 }}>
            <p style={{
              margin: "0 0 4px",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "hsl(var(--muted-foreground))",
            }}>{g.group}</p>
            {g.items.map((item, i) => {
              const Icon = item.Icon;
              return (
                <div
                  key={item.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "11px 4px",
                    borderBottom: i < g.items.length - 1 ? "1px solid hsl(var(--border))" : "none",
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: `hsl(24 95% 50% / 0.10)`,
                    border: `1px solid hsl(24 95% 50% / 0.18)`,
                    display: "grid", placeItems: "center", flexShrink: 0,
                    color: ORANGE,
                  }}>
                    <Icon size={19} strokeWidth={1.5} />
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    {item.label}
                  </span>
                  <ChevronRight size={16} color="hsl(var(--muted-foreground))" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────
export const AppTutorial = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-tutorial="${s.id}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const raf1 = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
    return () => cancelAnimationFrame(raf1);
  }, [step, s.id]);

  const advance = () => { if (isLast) onComplete(); else setStep((p) => p + 1); };
  const back    = () => setStep((p) => Math.max(0, p - 1));

  const p = s.pad;
  const hl = rect ? {
    top: rect.top - p, left: rect.left - p,
    width: rect.width + p * 2, height: rect.height + p * 2,
  } : null;

  // tooltip position (absolute inside fixed inset-0 overlay → viewport coords)
  let card: React.CSSProperties;
  if (s.side === "menu") {
    card = { top: 56, left: 16, right: 16 };
  } else if (s.side === "above") {
    card = { bottom: hl ? window.innerHeight - hl.top + 14 : 140, left: 16, right: 16 };
  } else {
    card = { top: hl ? hl.top + hl.height + 14 : 200, left: 16, right: 16 };
  }

  return (
    <div className="fixed inset-0 z-[200]" onClick={advance}>
      <style>{`
        @keyframes tutSheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes tutFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* Spotlight cutout OR full dim */}
      {s.side !== "menu" && hl ? (
        <div
          style={{
            position: "absolute",
            top: hl.top, left: hl.left,
            width: hl.width, height: hl.height,
            borderRadius: s.radius,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.76)",
            outline: `2px solid ${ORANGE}`,
            outlineOffset: 2,
            transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/76 pointer-events-none" />
      )}

      {/* Menu sheet (step 3 only) */}
      {s.side === "menu" && (
        <div className="absolute inset-0 pointer-events-none">
          <HIITMenuMock />
        </div>
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-[210]"
        style={{ ...card, animation: "tutFadeUp 0.35s ease both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: ORANGE }}>
              Step {step + 1} of {STEPS.length}
            </span>
            <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>Tap anywhere to continue</span>
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a0a0a", margin: "0 0 5px", letterSpacing: "-0.01em" }}>
            {s.title}
          </h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#52525b", margin: "0 0 16px" }}>
            {s.desc}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Dots */}
            <div style={{ display: "flex", gap: 6 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 18 : 7, height: 7, borderRadius: 999,
                  background: i === step ? ORANGE : "#e4e4e7",
                  transition: "all 0.25s ease",
                }} />
              ))}
            </div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); back(); }}
                  style={{
                    border: "1px solid #e4e4e7", cursor: "pointer", fontFamily: "inherit",
                    background: "#fff", color: "#52525b", fontSize: 13.5, fontWeight: 700,
                    padding: "9px 14px", borderRadius: 10,
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); advance(); }}
                style={{
                  border: 0, cursor: "pointer", fontFamily: "inherit",
                  background: ORANGE, color: "#1a0a00",
                  fontSize: 13.5, fontWeight: 800, padding: "9px 18px", borderRadius: 10,
                }}
              >
                {isLast ? "Let's Go!" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
