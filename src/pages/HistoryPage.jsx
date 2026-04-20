import '../styles/HistoryPage.css'
import { format } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { Input } from '../components/Input.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { useAuth } from '../hooks/useAuth.js'
import {
  addMeal,
  createMealTemplate,
  deleteMeal,
  deleteMealTemplate,
  listMealTemplates,
  listMeals,
  updateMeal,
} from '../services/db.js'
import { endOfLocalDay, startOfLocalDay } from '../utils/date.js'
import { formatFirestoreError } from '../utils/firestoreError.js'
import { formatNumber } from '../utils/format.js'

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', className: 'nl-meal-macro-calories' },
  { key: 'protein',  label: 'Protein',  unit: 'g' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g' },
  { key: 'fats',     label: 'Fats',     unit: 'g' },
  { key: 'healthScore', label: 'Health', unit: '/ 100' },
]

function MealRow({ meal, onDelete, onUpdate, onSaveTemplate, index }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(meal.description || '')
  const [calories,    setCalories]    = useState(meal.calories    ?? 0)
  const [protein,     setProtein]     = useState(meal.protein     ?? 0)
  const [carbs,       setCarbs]       = useState(meal.carbs       ?? 0)
  const [fats,        setFats]        = useState(meal.fats        ?? 0)
  const [healthScore, setHealthScore] = useState(meal.healthScore ?? 0)
  const [saving,      setSaving]      = useState(false)

  const timestamp = meal.timestamp?.toDate?.() || new Date()
  const dateLabel = format(timestamp, 'PPP · p')

  const onSave = useCallback(async () => {
    setSaving(true)
    try {
      await onUpdate(meal.id, {
        description,
        calories:    Number(calories),
        protein:     Number(protein),
        carbs:       Number(carbs),
        fats:        Number(fats),
        healthScore: Number(healthScore),
      })
      toast.success('Meal updated')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }, [onUpdate, meal.id, description, calories, protein, carbs, fats, healthScore])

  const onCancel = useCallback(() => {
    setDescription(meal.description || '')
    setCalories(meal.calories ?? 0)
    setProtein(meal.protein  ?? 0)
    setCarbs(meal.carbs      ?? 0)
    setFats(meal.fats        ?? 0)
    setHealthScore(meal.healthScore ?? 0)
    setEditing(false)
  }, [meal])

  return (
    <Card className="nl-meal-card" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="nl-meal-header">
        <div className="nl-meal-meta">
          <div className="nl-meal-name">{meal.description}</div>
          <div className="nl-meal-time">
            <span>🕐</span>
            {dateLabel}
          </div>
        </div>
        <div className="nl-meal-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSaveTemplate(meal)}
          >
            Save template
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Close' : '✏ Edit'}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onDelete(meal.id)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="nl-meal-macros">
        {MACROS.map(({ key, label, unit, className }) => (
          <div key={key} className={`nl-meal-macro${className ? ' ' + className : ''}`}>
            <div className="nl-meal-macro-label">{label}</div>
            <div className="nl-meal-macro-val">
              {formatNumber(meal[key])}
              <span className="nl-meal-macro-unit"> {unit}</span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="nl-edit-form">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="nl-edit-grid-2">
            <Input
              label="Calories (kcal)"
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
            <Input
              label="Health score (0–100)"
              type="number"
              min={0}
              max={100}
              value={healthScore}
              onChange={(e) => setHealthScore(e.target.value)}
            />
          </div>
          <div className="nl-edit-grid-3">
            <Input label="Protein (g)" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
            <Input label="Carbs (g)"   type="number" value={carbs}   onChange={(e) => setCarbs(e.target.value)} />
            <Input label="Fats (g)"    type="number" value={fats}    onChange={(e) => setFats(e.target.value)} />
          </div>
          <div className="nl-edit-actions">
            <Button type="button" loading={saving} disabled={saving} onClick={onSave}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function HistoryPage() {
  const { user } = useAuth()

  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [meals,   setMeals]   = useState([])
  const [templates, setTemplates] = useState([])
  const [templateBusy, setTemplateBusy] = useState('')

  const range = useMemo(() => ({
    start: from ? startOfLocalDay(new Date(from)) : null,
    end:   to   ? endOfLocalDay(new Date(to))     : null,
  }), [from, to])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [items, templateItems] = await Promise.all([
        listMeals({ userId: user.uid, startDate: range.start, endDate: range.end }),
        listMealTemplates({ userId: user.uid }),
      ])
      setMeals(items)
      setTemplates(templateItems)
    } catch (err) {
      setError(formatFirestoreError(err, 'Failed to load history'))
    } finally {
      setLoading(false)
    }
  }, [user, range.start, range.end])

  useEffect(() => { refresh() }, [refresh])

  const onDelete = useCallback(async (mealId) => {
    if (!user) return
    if (!window.confirm('Delete this meal?')) return
    try {
      await deleteMeal({ userId: user.uid, mealId })
      toast.success('Meal deleted')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [user, refresh])

  const onUpdate = useCallback(async (mealId, updates) => {
    if (!user) return
    await updateMeal({ userId: user.uid, mealId, updates })
    await refresh()
  }, [user, refresh])

  const onSaveTemplate = useCallback(async (meal) => {
    if (!user) return
    setTemplateBusy(`save:${meal.id}`)
    try {
      await createMealTemplate({
        userId: user.uid,
        template: {
          name: meal.description,
          description: meal.description,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fats: meal.fats,
          healthScore: meal.healthScore,
          suggestions: meal.suggestions,
        },
      })
      toast.success('Saved as template')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setTemplateBusy('')
    }
  }, [user, refresh])

  const onUseTemplate = useCallback(async (template) => {
    if (!user) return
    setTemplateBusy(`use:${template.id}`)
    try {
      await addMeal({
        userId: user.uid,
        meal: {
          description: template.description,
          image: null,
          calories: template.calories,
          protein: template.protein,
          carbs: template.carbs,
          fats: template.fats,
          healthScore: template.healthScore,
          suggestions: template.suggestions,
        },
      })
      toast.success('Meal logged from template')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log template meal')
    } finally {
      setTemplateBusy('')
    }
  }, [user, refresh])

  const onDeleteTemplate = useCallback(async (templateId) => {
    if (!user) return
    setTemplateBusy(`delete:${templateId}`)
    try {
      await deleteMealTemplate({ userId: user.uid, templateId })
      toast.success('Template deleted')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setTemplateBusy('')
    }
  }, [user, refresh])

  return (
    <div className="nl-page">
      <div className="nl-animate-fade-up">
        <h1 className="nl-page-title">Meal History</h1>
        <p className="nl-page-subtitle">Browse, edit, and delete past meals. Filter by date range.</p>
      </div>

      {/* Filters */}
      <Card className="nl-filter-card nl-animate-fade-up nl-stagger-1">
        <div className="nl-card-section-title" style={{ marginBottom: 14 }}>Filter by date</div>
        <div className="nl-filter-grid">
          <Input label="From" type="date" defaultValue={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To"   type="date" defaultValue={to}   onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Card className="nl-template-card nl-animate-fade-up nl-stagger-2">
        <div className="nl-card-section-title" style={{ marginBottom: 14 }}>Meal templates</div>
        {templates.length ? (
          <div className="nl-template-list">
            {templates.map((template) => (
              <div className="nl-template-item" key={template.id}>
                <div className="nl-template-info">
                  <div className="nl-template-name">{template.name || template.description}</div>
                  <div className="nl-template-macros">
                    {formatNumber(template.calories)} kcal · P {formatNumber(template.protein)}g · C {formatNumber(template.carbs)}g · F {formatNumber(template.fats)}g
                  </div>
                </div>
                <div className="nl-template-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={templateBusy.length > 0}
                    onClick={() => onUseTemplate(template)}
                  >
                    Log now
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={templateBusy.length > 0}
                    onClick={() => onDeleteTemplate(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="nl-page-subtitle" style={{ margin: 0 }}>
            Save any meal as a template to re-log it in one click.
          </p>
        )}
      </Card>

      <ErrorBanner message={error} />

      {/* Meal list */}
      {loading ? (
        <div className="nl-meal-list">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 120, width: '100%', borderRadius: 18 }} />
          ))}
        </div>
      ) : meals.length ? (
        <div className="nl-meal-list">
          {meals.map((m, i) => (
            <MealRow
              key={m.id}
              meal={m}
              index={i}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onSaveTemplate={onSaveTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="nl-empty-state">
          <div className="nl-empty-icon">📋</div>
          <div className="nl-empty-text">
            No meals found for this date range. Log a meal in the Analyzer to get started.
          </div>
        </div>
      )}
    </div>
  )
}
