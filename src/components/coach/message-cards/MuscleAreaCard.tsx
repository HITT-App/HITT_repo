import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const muscleGroups = [
  { id: 'hamstring', label: 'Hamstring' },
  { id: 'back', label: 'Back' },
  { id: 'glute', label: 'Glute' },
  { id: 'bicep', label: 'Bicep' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'forearm', label: 'Forearm' },
];

export function MuscleAreaCard() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        {/* Body Diagram Placeholder */}
        <div className="flex justify-center mb-4">
          <div className="w-48 h-64 relative">
            {/* Simplified body outline */}
            <svg viewBox="0 0 100 150" className="w-full h-full text-muted-foreground/30">
              {/* Head */}
              <circle cx="50" cy="15" r="10" fill="currentColor" />
              {/* Body */}
              <rect x="35" y="28" width="30" height="45" rx="5" fill="currentColor" />
              {/* Arms */}
              <rect x="15" y="30" width="18" height="8" rx="4" fill="currentColor" />
              <rect x="67" y="30" width="18" height="8" rx="4" fill="currentColor" />
              <rect x="10" y="38" width="10" height="25" rx="4" fill="currentColor" />
              <rect x="80" y="38" width="10" height="25" rx="4" fill="currentColor" />
              {/* Legs */}
              <rect x="35" y="75" width="12" height="50" rx="5" fill="currentColor" />
              <rect x="53" y="75" width="12" height="50" rx="5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Muscle Group Buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          {muscleGroups.map((group) => (
            <Button
              key={group.id}
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
            >
              {group.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
