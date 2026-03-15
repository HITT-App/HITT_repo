import { useNavigate } from "react-router-dom";
import { X, Waves, Footprints, Activity, Dumbbell, Mountain, TreePine, Bike, Flame, PersonStanding, Route } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/lib/routes";

interface ChooseSportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const topSports = [
  { name: "Swim", icon: Waves, color: "text-blue-400" },
  { name: "Run", icon: Footprints, color: "text-green-400" },
  { name: "Workout", icon: Activity, color: "text-orange-400" },
  { name: "Weight Training", icon: Dumbbell, color: "text-red-400" },
];

const categories = [
  {
    title: "Foot Sports",
    sports: [
      { name: "Run", icon: Footprints },
      { name: "Trail Run", icon: Mountain },
      { name: "Walk", icon: PersonStanding },
      { name: "Hike", icon: TreePine },
    ],
  },
  {
    title: "Water Sports",
    sports: [
      { name: "Swim", icon: Waves },
      { name: "Surf", icon: Waves },
    ],
  },
  {
    title: "Gym",
    sports: [
      { name: "Weight Training", icon: Dumbbell },
      { name: "HIIT", icon: Flame },
      { name: "Yoga", icon: PersonStanding },
      { name: "Cycling", icon: Bike },
    ],
  },
];

const INDOOR_SPORTS = new Set(["Workout", "Weight Training", "HIIT", "Yoga"]);

export const ChooseSportSheet = ({ open, onOpenChange }: ChooseSportSheetProps) => {
  const navigate = useNavigate();

  const handleSelect = (sport: string) => {
    onOpenChange(false);
    const route = INDOOR_SPORTS.has(sport) ? "/gym-timer" : "/activity-live";
    navigate(`${route}?sport=${encodeURIComponent(sport)}`);
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
            {/* Banner */}
            <div className="rounded-2xl border border-border bg-muted/60 p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">New</p>
              <p className="text-sm font-bold text-foreground mt-1">New Sports available!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check out the latest additions to your sport list.</p>
            </div>

            {/* Top Sports */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Your Top Sports</h3>
              <div className="flex gap-4">
                {topSports.map((sport) => (
                  <button
                    key={sport.name}
                    onClick={() => handleSelect(sport.name)}
                    className="flex flex-col items-center gap-1.5 min-w-[60px] touch-manipulation"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <sport.icon size={24} className={sport.color} />
                    </div>
                    <span className="text-[11px] font-medium text-foreground text-center leading-tight">{sport.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            {categories.map((cat) => (
              <div key={cat.title}>
                <h3 className="text-sm font-bold text-foreground mb-2">{cat.title}</h3>
                <div className="space-y-1">
                  {cat.sports.map((sport) => (
                    <button
                      key={sport.name}
                      onClick={() => handleSelect(sport.name)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <sport.icon size={18} className="text-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{sport.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
