import { useAuth } from './useAuth'
import { useProfile } from './useProfile'

export function useFirstName(): { firstName: string | null; loading: boolean } {
  const { user } = useAuth()
  const { profile, loading } = useProfile()

  if (loading) return { firstName: null, loading: true }

  const fullName = profile?.display_name || user?.user_metadata?.display_name || null
  const firstName = fullName?.split(' ')[0] || null

  return { firstName, loading: false }
}
