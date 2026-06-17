import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export type PlanState = 'loading' | 'none' | 'active'

export function usePlanStatus() {
  const { user } = useAuth()
  const [planState, setPlanState] = useState<PlanState>('loading')

  useEffect(() => {
    if (!user) { setPlanState('none'); return }

    const today = new Date().toISOString().slice(0, 10)
    supabase
      .from('scheduled_workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('scheduled_date', today)
      .then(({ count }) => {
        setPlanState(count && count > 0 ? 'active' : 'none')
      })
  }, [user])

  return planState
}
