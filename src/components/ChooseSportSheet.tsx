import { useNavigate } from "react-router-dom";
import { X, Route } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/lib/routes";
import { SPORT_CONFIG, getTrackerRoute } from "@/lib/sports";

interface ChooseSportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const topSportKeys = ["Swim", "Run", "Workout", "Weight Training"];

const categories = [
  { title: "Foot Sports", sports: ["Run", "Trail Run", "Walk", "Hike"] },
  { title: "Water Sports", sports: ["Swim", "Surf"] },
  { title: "Gym", sports: ["Weight Training", "HIIT", "Yoga", "Cycling"] },
];

export const ChooseSportSheet = ({ open, onOpenChange }: ChooseSportSheetProps) => {
  const navigate = useNavigate();

  const handleSelect = (sport: string) => {
    onOpenChange(false);
    navigate(`${getTrackerRoute(sport)}?sport=${encodeURIComponent(sport)}`);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] px-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-lg font-bold text-foreground">Choose a Sport</h2>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full bg-muted text-muted-foreground">
              <X size={18} />
            </button>
          </DrawerClose>
        </div>

        <ScrollArea className="h-[70vh]">
          <div className="px-5 pb-8 space-y-6">
            {/* Routes Banner */}
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

            {/* Top Sports */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Your Top Sports</h3>
              <div className="flex gap-4">
                {topSportKeys.map((key) => {
                  const sport = SPORT_CONFIG[key];
                  if (!sport) return null;
                  const Icon = sport.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelect(key)}
                      className="flex flex-col items-center gap-1.5 min-w-[60px] touch-manipulation"
                    >
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                        <Icon size={24} className={sport.color} />
                      </div>
                      <span className="text-[11px] font-medium text-foreground text-center leading-tight">{sport.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            {categories.map((cat) => (
              <div key={cat.title}>
                <h3 className="text-sm font-bold text-foreground mb-2">{cat.title}</h3>
                <div className="space-y-1">
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
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{sport.name}</span>
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
