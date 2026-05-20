import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, Map, Timer, ChevronRight } from 'lucide-react'

const SPORTS = [
  {
    icon: Activity,
    title: 'Triathlon',
    subtitle: 'Train for swim, bike, run — track every leg',
    path: '/triathlon',
  },
  {
    icon: Map,
    title: 'Routes',
    subtitle: 'Discover and follow GPS routes',
    path: '/routes',
  },
  {
    icon: Timer,
    title: 'Gym Timer',
    subtitle: 'Timed sets for strength and circuits',
    path: '/gym-timer',
  },
]

export function SportsTab() {
  const navigate = useNavigate()
  return (
    <div className="space-y-3 pt-2">
      {SPORTS.map(sport => (
        <Card
          key={sport.path}
          className="cursor-pointer active:bg-secondary/50 transition-colors touch-manipulation"
          onClick={() => navigate(sport.path)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <sport.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{sport.title}</p>
              <p className="text-xs text-muted-foreground">{sport.subtitle}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
