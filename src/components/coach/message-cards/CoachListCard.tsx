import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, ChevronRight } from 'lucide-react';

const coaches = [
  {
    id: 1,
    name: 'Coach Arnold Swarznible',
    price: '$100 - $250/session',
    specialty: 'HIIT Expert',
    distance: '500m',
    rating: 3.2,
    reviews: 226,
    available: true,
    avatarUrl: null,
  },
  {
    id: 2,
    name: 'Coach Mufasa White',
    price: '$100 - $250/session',
    specialty: 'Pro Bodybuilder',
    distance: '8.1km',
    rating: 1.5,
    reviews: 11,
    available: true,
    avatarUrl: null,
  },
];

export function CoachListCard() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        {coaches.map((coach) => (
          <button
            key={coach.id}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{coach.name}</p>
              <p className="text-xs text-muted-foreground">{coach.price}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  🏋️ {coach.specialty}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {coach.distance}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs">{coach.rating}</span>
                  <span className="text-xs text-muted-foreground">({coach.reviews})</span>
                </div>
                {coach.available && (
                  <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0">
                    Available Remotely
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
