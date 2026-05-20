import { useNavigate } from 'react-router-dom'
import triathlonImg from '@/assets/sports-triathlon.webp.jpeg'
import gymImg from '@/assets/sports-gym.webp.jpeg'
import routesImg from '@/assets/sports-routes.webp.jpeg'

const SPORTS = [
  {
    title: 'Triathlon',
    eyebrow: 'Multi-sport',
    subtitle: 'Swim · bike · run',
    path: '/triathlon',
    image: triathlonImg,
  },
  {
    title: 'Gym',
    eyebrow: 'Strength',
    subtitle: 'Sets · circuits · timers',
    path: '/gym-timer',
    image: gymImg,
  },
  {
    title: 'Routes',
    eyebrow: 'Outdoor',
    subtitle: 'GPS · trails · paths',
    path: '/routes',
    image: routesImg,
  },
]

export function SportsTab() {
  const navigate = useNavigate()
  return (
    <div className="space-y-3 pt-2">
      {SPORTS.map(sport => (
        <button
          key={sport.path}
          onClick={() => navigate(sport.path)}
          aria-label={`Open ${sport.title}`}
          className="relative w-full overflow-hidden rounded-lg aspect-[2/1] active:scale-[0.98] transition-transform duration-150 touch-manipulation bg-muted"
        >
          <img
            src={sport.image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />

          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 33%, rgba(0,0,0,0) 60%)',
            }}
            aria-hidden="true"
          />

          <div className="relative h-full flex flex-col justify-center px-5 py-4 text-left">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/80">
              {sport.eyebrow}
            </p>
            <h3 className="text-2xl font-semibold text-white mt-1">
              {sport.title}
            </h3>
            <p className="text-sm text-white/85 mt-1">
              {sport.subtitle}
            </p>
            <span className="inline-flex items-center gap-1 mt-3 self-start px-3 py-1 rounded-full bg-white text-primary text-xs font-medium">
              Get started <span aria-hidden="true">→</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
