import type { MealInPlan } from '@/hooks/useAI.types'

interface StoredMealPlan {
  date: string
  meals: MealInPlan[]
  loggedNames: string[]
}

function key(userId: string) {
  return `hitt_meal_plan_${userId}`
}

export function saveMealPlan(userId: string, meals: MealInPlan[]) {
  const today = new Date().toISOString().split('T')[0]
  const stored: StoredMealPlan = { date: today, meals, loggedNames: [] }
  localStorage.setItem(key(userId), JSON.stringify(stored))
}

export function getMealPlan(userId: string, date: string): StoredMealPlan | null {
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return null
    const stored: StoredMealPlan = JSON.parse(raw)
    if (stored.date !== date) return null
    return stored
  } catch {
    return null
  }
}

export function markMealPlanLogged(userId: string, mealName: string) {
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return
    const stored: StoredMealPlan = JSON.parse(raw)
    if (!stored.loggedNames.includes(mealName)) {
      stored.loggedNames.push(mealName)
      localStorage.setItem(key(userId), JSON.stringify(stored))
    }
  } catch {}
}

export function clearMealPlan(userId: string) {
  localStorage.removeItem(key(userId))
}
