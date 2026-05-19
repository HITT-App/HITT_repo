import { useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'

interface FloatingActionButtonProps {
  onClick: () => void
}

const HIDDEN_ROUTES = [
  '/ai-coach',
  '/workout-player',
  '/activity-live',
  '/gym-timer',
  '/sleeping',
  '/live-session',
  '/auth',
  '/assessment',
  '/onboarding',
  '/welcome',
  '/community/chatroom',
  '/community/post',
  '/community/story',
  '/community/create-story',
  '/routes',
  '/route/',
]

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const { pathname } = useLocation()

  if (HIDDEN_ROUTES.some(route => pathname.startsWith(route))) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-28 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      aria-label="Quick add"
    >
      <Plus className="w-5 h-5" />
    </button>
  )
}
