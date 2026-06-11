import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Medal, Route, ChevronRight, ArrowRight, Waves, Bike, Footprints } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPORT_CONFIG, SPORT_CATEGORIES, getTrackerRoute } from "@/lib/sports";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface ChooseSportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#121212',
  card:     '#141414',
  cardHi:   '#1b1b1b',
  border:   '#262626',
  fg:       '#fafafa',
  dim:      '#9b9b9b',
  faint:    '#5a5a5a',
  primary:  '#FF8A26',
  gold:     '#F0B53C',
  goldDeep: '#D2901E',
};

// Hex accent colors keyed by sport name, matching the design catalogue
const SPORT_HEX: Record<string, string> = {
  Run:               '#4ade80',
  'Trail Run':       '#34d399',
  Walk:              '#38bdf8',
  'Power Walk':      '#0ea5e9',
  Hike:              '#a3e635',
  Cycling:           '#22d3ee',
  'Mountain Bike':   '#0891b2',
  'Weight Training': '#f87171',
  Bodyweight:        '#fb923c',
  Functional:        '#f59e0b',
  CrossFit:          '#ef4444',
  HIIT:              '#fbbf24',
  Tabata:            '#dc2626',
  Circuit:           '#d97706',
  'Jump Rope':       '#ec4899',
  'Stair Climber':   '#ea580c',
  Rowing:            '#3b82f6',
  Elliptical:        '#818cf8',
  Swim:              '#60a5fa',
  Surf:              '#2dd4bf',
  Kayak:             '#14b8a6',
  Paddleboard:       '#5eead4',
  Yoga:              '#c084fc',
  Pilates:           '#f472b6',
  Stretching:        '#a78bfa',
  Meditation:        '#a5b4fc',
  'Tai Chi':         '#6ee7b7',
  Boxing:            '#ef4444',
  Kickboxing:        '#dc2626',
  MMA:               '#b91c1c',
  'Jiu-Jitsu':       '#94a3b8',
  Dance:             '#e879f9',
  Zumba:             '#d946ef',
  Tennis:            '#facc15',
  Basketball:        '#f97316',
  Football:          '#22c55e',
  Badminton:         '#84cc16',
  Paddle:            '#2dd4bf',
  Skiing:            '#93c5fd',
  Snowboarding:      '#60a5fa',
  Triathlon:         '#F0B53C',
  Hyrox:             '#f97316',
};

// Sports that use the custom boxing glove glyph
const GLOVE_SPORTS = new Set(['Boxing', 'Kickboxing', 'MMA']);

// Filter pill → category title mapping
const FILTER_CATS: Record<string, string[]> = {
  All:      [],
  Cardio:   ['Running & Walking', 'Cycling', 'HIIT & Cardio'],
  Strength: ['Strength'],
  Water:    ['Water Sports'],
  Mind:     ['Mind & Body', 'Dance'],
  Combat:   ['Combat'],
};
const FILTERS = Object.keys(FILTER_CATS) as (keyof typeof FILTER_CATS)[];

// Quick-start sports shown in the round-chip rail
const QUICK_START = ['Run', 'HIIT', 'Weight Training', 'Swim', 'Cycling', 'Boxing'];
const QUICK_LABELS: Record<string, string> = { 'Weight Training': 'Weights' };

// ── Custom boxing-glove SVG (lucide has none) ────────────────────────────────
function GloveMark({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <path d="M8 13.5V8a4 4 0 0 1 4-4h1.5a4 4 0 0 1 4 4v5.5" />
      <path d="M8 9.5a2.4 2.4 0 0 0 0 4.8" />
      <path d="M7.5 13.5H18v2.5a3 3 0 0 1-3 3h-4.5a3 3 0 0 1-3-3Z" />
    </svg>
  );
}

// Render the sport's icon — custom glove for combat sports, lucide otherwise
function SportIcon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  if (GLOVE_SPORTS.has(name)) return <GloveMark size={size} color={color} />;
  const config = SPORT_CONFIG[name];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon size={size} color={color} strokeWidth={2.1} />;
}

// Swim → Bike → Run stage chips shown in the Triathlon hero
function StageFlow() {
  const stages: [React.ReactNode, string][] = [
    [<Waves size={13} color="rgba(42,28,5,0.7)" strokeWidth={2.2} />, 'Swim'],
    [<Bike  size={13} color="rgba(42,28,5,0.7)" strokeWidth={2.2} />, 'Bike'],
    [<Footprints size={13} color="rgba(42,28,5,0.7)" strokeWidth={2.2} />, 'Run'],
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {stages.map(([icon, label], i) => (
        <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: i < 2 ? 6 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, background: 'rgba(42,28,5,0.14)' }}>
            {icon}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2a1c05' }}>{label}</span>
          </div>
          {i < 2 && <ChevronRight size={13} color="rgba(42,28,5,0.45)" strokeWidth={2.4} />}
        </div>
      ))}
    </div>
  );
}

export const ChooseSportSheet = ({ open, onOpenChange }: ChooseSportSheetProps) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const handleSelect = (sport: string) => {
    onOpenChange(false);
    navigate(`${getTrackerRoute(sport)}?sport=${encodeURIComponent(sport)}`);
  };

  const handleTriathlon = () => {
    onOpenChange(false);
    navigate(ROUTES.TRIATHLON);
  };

  const handleRoutes = () => {
    onOpenChange(false);
    navigate(ROUTES.ROUTES_EXPLORER);
  };

  // Build filtered sport list for the 2-up grid
  const filteredSports: string[] = (() => {
    const cats = FILTER_CATS[activeFilter];
    if (!cats || cats.length === 0) {
      // All — flatten all categories
      return SPORT_CATEGORIES.flatMap(c => c.sports);
    }
    return SPORT_CATEGORIES
      .filter(c => cats.includes(c.title))
      .flatMap(c => c.sports);
  })();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="flex flex-col border-0 outline-none"
        style={{
          background: C.bg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          border: `1px solid ${C.border}`,
          borderBottom: 'none',
          boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
          paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div style={{ width: 38, height: 5, borderRadius: 999, background: '#3a3a3a' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1.5 pb-3 flex-shrink-0">
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.4px', color: C.fg }}>
            Choose a Sport
          </h2>
          <DrawerClose asChild>
            <button
              style={{ width: 32, height: 32, borderRadius: 999, background: '#202020', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              aria-label="Close"
            >
              <X size={17} color={C.dim} strokeWidth={2.4} />
            </button>
          </DrawerClose>
        </div>

        {/* Triathlon flagship hero */}
        <div className="px-5 mb-4 flex-shrink-0">
          <button
            onClick={handleTriathlon}
            className="w-full text-left touch-manipulation"
            style={{
              position: 'relative', overflow: 'hidden', borderRadius: 20, padding: 17,
              background: `linear-gradient(150deg, #F6C45A 0%, ${C.gold} 52%, ${C.goldDeep} 100%)`,
              boxShadow: '0 14px 32px -12px rgba(240,181,60,0.6)',
              border: 'none', cursor: 'pointer', display: 'block', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Decorative circle */}
            <div style={{ position: 'absolute', top: -34, right: -24, width: 130, height: 130, borderRadius: 999, background: 'rgba(255,255,255,0.18)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(42,28,5,0.16)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Medal size={24} color="#2a1c05" strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 19, fontWeight: 800, color: '#2a1c05', letterSpacing: '-0.3px' }}>Triathlon</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(42,28,5,0.62)', marginTop: 2 }}>Multi-stage tracker</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: '#2a1c05', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <ArrowRight size={16} color={C.gold} strokeWidth={2.4} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <StageFlow />
              </div>
            </div>
          </button>
        </div>

        {/* Routes & Trails banner */}
        <div className="px-5 mb-4 flex-shrink-0">
          <button
            onClick={handleRoutes}
            className="w-full text-left touch-manipulation"
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 16,
              background: 'rgba(255,138,38,0.07)', border: '1px solid rgba(255,138,38,0.28)',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(255,138,38,0.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Route size={19} color={C.primary} strokeWidth={2.1} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.fg }}>Routes &amp; Trails</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>Discover and create running routes</div>
            </div>
            <ChevronRight size={19} color={C.primary} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          </button>
        </div>

        {/* Scrollable body: Quick Start + Filter pills + 2-up grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 pb-8">
            {/* Quick Start rail */}
            <div className="mb-5">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginBottom: 13 }}>
                Quick Start
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {QUICK_START.map((name) => {
                  const hex = SPORT_HEX[name] || '#f97316';
                  return (
                    <button
                      key={name}
                      onClick={() => handleSelect(name)}
                      className="touch-manipulation"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: 0 }}
                    >
                      <div style={{ width: 50, height: 50, borderRadius: 999, background: `${hex}1c`, border: `1px solid ${hex}2e`, display: 'grid', placeItems: 'center' }}>
                        <SportIcon name={name} size={21} color={hex} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.dim, textAlign: 'center' }}>
                        {QUICK_LABELS[name] || name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="no-scrollbar">
              {FILTERS.map((f) => {
                const on = f === activeFilter;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className="touch-manipulation flex-shrink-0"
                    style={{
                      padding: '8px 15px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                      background: on ? C.primary : '#1c1c1c',
                      color: on ? '#1a0a00' : C.dim,
                      border: `1px solid ${on ? C.primary : C.border}`,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* 2-up sport card grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              {filteredSports.map((name) => {
                const hex = SPORT_HEX[name] || '#f97316';
                const config = SPORT_CONFIG[name];
                if (!config) return null;
                const label = name === 'Weight Training' ? 'Weights' : name;
                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
                    className="text-left touch-manipulation"
                    style={{
                      borderRadius: 16, padding: 14, background: C.card,
                      border: `1px solid ${C.border}`,
                      display: 'flex', flexDirection: 'column', gap: 11,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.background = C.cardHi; }}
                    onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.background = C.card; }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: `${hex}1c`, border: `1px solid ${hex}2e`, display: 'grid', placeItems: 'center' }}>
                      <SportIcon name={name} size={20} color={hex} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.fg, lineHeight: 1.2 }}>{label}</div>
                      <div style={{ fontSize: 11, color: C.faint, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                        {config.met.toFixed(1)} MET · {config.tracker === 'gps' ? 'GPS' : 'Timer'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
