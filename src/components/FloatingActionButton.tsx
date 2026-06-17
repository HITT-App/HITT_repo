import { useLocation } from 'react-router-dom'

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
  '/goal-setup',
  '/schedule-setup',
  '/log-meal',
]

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const { pathname } = useLocation()

  if (HIDDEN_ROUTES.some(route => pathname.startsWith(route))) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-32 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      aria-label="Open Jarvis"
      data-tutorial="fab"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 1 1 21 11.5Z" />
        <path d="M7.5 12.2v-.4M10.2 13v-2M12.9 13.6v-3.2M15.6 13v-2M18.3 12.2v-.4" strokeWidth="2.1" />
      </svg>
    </button>
  )
}
