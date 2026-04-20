import '../styles/OnboardingPage.css'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { Input } from '../components/Input.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { calculateTargets, targetPresets } from '../utils/targets.js'

export default function OnboardingPage() {
  const { user, userProfile, updateUserProfile } = useAuth()
  const navigate = useNavigate()

  const [age, setAge] = useState('25')
  const [sex, setSex] = useState('male')
  const [weightKg, setWeightKg] = useState('70')
  const [heightCm, setHeightCm] = useState('170')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [goal, setGoal] = useState('maintain')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const existing = userProfile?.onboarding
    if (!existing) return
    if (existing.age) setAge(String(existing.age))
    if (existing.sex) setSex(existing.sex)
    if (existing.weightKg) setWeightKg(String(existing.weightKg))
    if (existing.heightCm) setHeightCm(String(existing.heightCm))
    if (existing.activityLevel) setActivityLevel(existing.activityLevel)
    if (existing.goal) setGoal(existing.goal)
  }, [userProfile])

  const targets = useMemo(() => calculateTargets({
    age,
    sex,
    weightKg,
    heightCm,
    activityLevel,
    goal,
  }), [age, sex, weightKg, heightCm, activityLevel, goal])

  if (!user) return <Navigate to="/login" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setError('')
    try {
      await updateUserProfile({
        onboardingComplete: true,
        onboarding: {
          age: Number(age),
          sex,
          weightKg: Number(weightKg),
          heightCm: Number(heightCm),
          activityLevel,
          goal,
        },
        targets,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="nl-page">
      <div className="nl-onboarding-head nl-animate-fade-up">
        <h1 className="nl-page-title">Set your nutrition baseline</h1>
        <p className="nl-page-subtitle">
          We use your body metrics and activity to calculate TDEE, daily calories,
          macro targets, and hydration goal.
        </p>
      </div>

      <div className="nl-onboarding-grid">
        <Card className="nl-onboarding-card nl-animate-fade-up nl-stagger-1">
          <form className="nl-onboarding-form" onSubmit={onSubmit}>
            <ErrorBanner message={error} />

            <div className="nl-onboarding-2col">
              <Input
                label="Age"
                type="number"
                min={13}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
              <label className="nl-field">
                <span className="nl-field-label">Sex</span>
                <select
                  className="nl-input"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div className="nl-onboarding-2col">
              <Input
                label="Weight (kg)"
                type="number"
                min={30}
                max={260}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
              />
              <Input
                label="Height (cm)"
                type="number"
                min={120}
                max={230}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                required
              />
            </div>

            <label className="nl-field">
              <span className="nl-field-label">Activity level</span>
              <select
                className="nl-input"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
              >
                {targetPresets.activity.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="nl-field">
              <span className="nl-field-label">Goal</span>
              <select
                className="nl-input"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              >
                {targetPresets.goals.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <div className="nl-onboarding-actions">
              <Button type="submit" size="lg" loading={saving} disabled={saving}>
                {saving ? 'Saving plan...' : 'Save targets and continue'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="nl-onboarding-preview nl-animate-fade-up nl-stagger-2">
          <div className="nl-card-section-title">Your calculated targets</div>
          <div className="nl-preview-list">
            <div className="nl-preview-row">
              <span>TDEE</span>
              <strong>{targets.tdee} kcal</strong>
            </div>
            <div className="nl-preview-row">
              <span>Daily calories</span>
              <strong>{targets.calories} kcal</strong>
            </div>
            <div className="nl-preview-row">
              <span>Protein</span>
              <strong>{targets.protein} g</strong>
            </div>
            <div className="nl-preview-row">
              <span>Carbs</span>
              <strong>{targets.carbs} g</strong>
            </div>
            <div className="nl-preview-row">
              <span>Fats</span>
              <strong>{targets.fats} g</strong>
            </div>
            <div className="nl-preview-row">
              <span>Water</span>
              <strong>{targets.waterMl} ml</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
