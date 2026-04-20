import { clamp } from './format.js'

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
}

const GOAL_MULTIPLIER = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
}

function baseBmr({ sex, age, weightKg, heightCm }) {
  const common = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'male') return common + 5
  if (sex === 'female') return common - 161
  return common - 78
}

export function calculateTargets({ age, sex, weightKg, heightCm, activityLevel, goal }) {
  const safeAge = clamp(Number(age) || 25, 13, 100)
  const safeWeight = clamp(Number(weightKg) || 70, 30, 260)
  const safeHeight = clamp(Number(heightCm) || 170, 120, 230)
  const activity = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate
  const goalMult = GOAL_MULTIPLIER[goal] || GOAL_MULTIPLIER.maintain

  const bmr = baseBmr({
    sex,
    age: safeAge,
    weightKg: safeWeight,
    heightCm: safeHeight,
  })

  const tdee = Math.round(bmr * activity)
  const calories = Math.max(1200, Math.round(tdee * goalMult))

  const proteinFactor = goal === 'lose' ? 2 : 1.8
  const protein = Math.round(safeWeight * proteinFactor)
  const fats = Math.round(safeWeight * 0.8)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4))
  const waterMl = Math.round(safeWeight * 35)

  return {
    calories,
    protein,
    carbs,
    fats,
    waterMl,
    tdee,
  }
}

export const targetPresets = {
  activity: [
    { value: 'sedentary', label: 'Sedentary (desk job, little exercise)' },
    { value: 'light', label: 'Light (1-3 workouts/week)' },
    { value: 'moderate', label: 'Moderate (3-5 workouts/week)' },
    { value: 'active', label: 'Active (6-7 workouts/week)' },
    { value: 'athlete', label: 'Very active / athlete' },
  ],
  goals: [
    { value: 'lose', label: 'Lose fat' },
    { value: 'maintain', label: 'Maintain weight' },
    { value: 'gain', label: 'Gain muscle' },
  ],
}
