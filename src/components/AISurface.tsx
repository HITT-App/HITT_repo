import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { JarvisMode } from '@/components/coach/JarvisMode';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { ScanLine, UtensilsCrossed, Target, Dumbbell, ArrowLeft } from 'lucide-react';

type AISurfaceTab = 'chat' | 'coach' | 'settings';

const COACH_TILES = [
  { icon: ScanLine, label: 'Body Scan', description: 'Analyse your body composition' },
  { icon: UtensilsCrossed, label: 'Meal Planner', description: 'Plan your nutrition' },
  { icon: Target, label: 'Goal Definer', description: 'Set and track your goals' },
  { icon: Dumbbell, label: 'Workout Planner', description: 'Build your training plan' },
];

export function AISurface() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile: healthProfile } = useHealthProfile();
  const locationState = location.state as { tab?: AISurfaceTab; prefillMessage?: string } | null;
  const [activeTab, setActiveTab] = useState<AISurfaceTab>(locationState?.tab ?? 'chat');
  const prefillMessage = locationState?.prefillMessage;

  return (
    <div className="flex flex-col h-dvh bg-background">
      <header
        className="flex items-center px-4 border-b border-border/40 bg-background shrink-0"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)", paddingBottom: "12px" }}
      >
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 mr-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">AI Coach</h1>
      </header>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AISurfaceTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="grid grid-cols-3 mx-4 my-3 shrink-0">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="coach">Coach</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          {activeTab === 'chat' && (
            <JarvisMode
              onClose={() => prefillMessage ? navigate('/') : navigate(-1)}
              healthProfile={healthProfile ?? undefined}
              prefillMessage={prefillMessage}
            />
          )}
        </TabsContent>
        <TabsContent value="coach" className="flex-1 mt-0 p-4">
          <div className="grid grid-cols-2 gap-4 mt-2">
            {COACH_TILES.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="relative rounded-2xl border border-border/40 bg-secondary/30 p-4 opacity-50 flex flex-col gap-2"
              >
                <span className="absolute top-2 right-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-background/60 px-1.5 py-0.5 rounded-full">
                  Coming next
                </span>
                <Icon className="w-6 h-6 text-muted-foreground" />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{description}</p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="settings" className="flex-1 mt-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Settings coming next</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
