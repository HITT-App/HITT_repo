import { useNavigate } from "react-router-dom";
import { X, Route, Search, Trophy } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { SPORT_CONFIG, SPORT_CATEGORIES, getTrackerRoute } from "@/lib/sports";
import { useState } from "react";

interface ChooseSportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const topSportKeys = ["Run", "HIIT", "Weight Training", "Swim", "Cycling", "Boxing"];

export const ChooseSportSheet = ({ open, onOpenChange }: ChooseSportSheetProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSelect = (sport: string) => {
    onOpenChange(false);
    navigate(`${getTrackerRoute(sport)}?sport=${encodeURIComponent(sport)}`);
  };

  const filteredCategories = search.trim()
    ? SPORT_CATEGORIES.map((cat) => ({
        ...cat,
        sports: cat.sports.filter((s) => {
          const config = SPORT_CONFIG[s];
          return config && config.name.toLowerCase().includes(search.toLowerCase());
        }),
      })).filter((cat) => cat.sports.length > 0)
    : SPORT_CATEGORIES;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] px-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-2">
          <h2 className="text-lg font-bold text-foreground">Choose a Sport</h2>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full bg-muted text-muted-foreground">
              <X size={18} />
            </button>
          </DrawerClose>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search sports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted border-0"
            />
          </div>
        </div>

        <ScrollArea className="h-[65vh]">
          <div className="px-5 pb-8 space-y-5">
            {/* Triathlon Flagship Banner */}
            {!search && (
              <button
                onClick={() => { onOpenChange(false); navigate(ROUTES.TRIATHLON); }}
                className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden border border-yellow-500/30"
                style={{
                  background: "linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(245,158,11,0.1) 50%, rgba(217,119,6,0.15) 100%)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-amber-500/5" />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/25">
                    <Trophy size={22} className="text-black" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">Triathlon</p>
                      <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">FLAGSHIP</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Swim → Bike → Run • Multi-stage tracker</p>
                  </div>
                </div>
              </button>
            )}

            {/* Routes Banner */}
            {!search && (
              <button
                onClick={() => { onOpenChange(false); navigate(ROUTES.ROUTES_EXPLORER); }}
                className="w-full rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Route size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Routes & Trails</p>
                    <p className="text-xs text-muted-foreground">Discover and create running routes</p>
                  </div>
                </div>
              </button>
            )}

            {/* Quick picks (no search) */}
            {!search && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Start</h3>
                <div className="flex gap-3 flex-wrap">
                  {topSportKeys.map((key) => {
                    const sport = SPORT_CONFIG[key];
                    if (!sport) return null;
                    const Icon = sport.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelect(key)}
                        className="flex flex-col items-center gap-1.5 min-w-[56px] touch-manipulation"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Icon size={20} className={sport.color} />
                        </div>
                        <span className="text-[10px] font-medium text-foreground text-center leading-tight max-w-[56px]">{sport.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All categories */}
            {filteredCategories.map((cat) => (
              <div key={cat.title}>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{cat.title}</h3>
                <div className="space-y-0.5">
                  {cat.sports.map((key) => {
                    const sport = SPORT_CONFIG[key];
                    if (!sport) return null;
                    const Icon = sport.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelect(key)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
                      >
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon size={16} className={sport.color} />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-sm font-medium text-foreground">{sport.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{sport.met} MET</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
