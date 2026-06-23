import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'

export type PlanState = 'loading' | 'none' | 'active'

export function usePlanStatus() {
  const { user } = useAuth()
  const [planState, setPlanState] = useState<PlanState>('loading')

  useEffect(() => {
    if (!user) { setPlanState('none'); return }

    const today = format(new Date(), 'yyyy-MM-dd')
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
