import '../styles/DashboardPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer, CartesianGrid,
  XAxis, YAxis, Tooltip, Area, AreaChart,
} from 'recharts'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Input } from '../components/Input.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { addMeal, getDailyLog, listLogsRange, setDailyWater } from '../services/db.js'
import { lastNDaysRange, toDateKey } from '../utils/date.js'
import { formatFirestoreError } from '../utils/firestoreError.js'
import { formatNumber } from '../utils/format.js'

const STATS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: '🔥' },
  { key: 'protein', label: 'Protein', unit: 'g', icon: '💪' },
  { key: 'carbs', label: 'Carbs', unit: 'g', icon: '🌾' },
  { key: 'fats', label: 'Fats', unit: 'g', icon: '🥑' },
]

const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 130,
  carbs: 220,
  fats: 65,
  waterMl: 2500,
}

const CHART_METRICS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fats', label: 'Fats', unit: 'g' },
  { key: 'waterMl', label: 'Water', unit: 'ml' },
]

function StatCard({ label, value, unit, icon, loading, index }) {
  return (
    <Card className={`nl-stat-card nl-animate-fade-up nl-stagger-${index + 1}`}>
      <span className="nl-stat-icon">{icon}</span>
      <div className="nl-stat-label">{label}</div>
      {loading ? (
        <Skeleton style={{ height: 36, width: 100, marginTop: 4 }} />
      ) : (
        <div className="nl-stat-value">
          {value}
          <span className="nl-stat-unit">{unit}</span>
        </div>
      )}
      <div className="nl-stat-sub">Today</div>
    </Card>
  )
}

function ProgressBar({ value, max, loading, unit = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <div>
      <div className="nl-progress-meta">
        <span className="nl-progress-pct">{pct}%</span>
        <span>{formatNumber(value)} / {formatNumber(max)} {unit}</span>
      </div>
      <div className="nl-progress-track">
        {loading ? (
          <Skeleton style={{ height: '100%', width: '100%', borderRadius: 99 }} />
        ) : (
          <div className={`nl-progress-fill${pct >= 100 ? ' nl-progress-over' : ''}`} style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  )
}

function MacroRing({ label, value, target, unit, color }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const angle = Math.round((pct / 100) * 360)

  return (
    <div className="nl-ring-card">
      <div
        className="nl-ring"
        style={{
          background: `conic-gradient(${color} ${angle}deg, var(--nl-surface-2) ${angle}deg 360deg)`,
        }}
      >
        <div className="nl-ring-inner">
          <span>{pct}%</span>
        </div>
      </div>
      <div className="nl-ring-label">{label}</div>
      <div className="nl-ring-value">{formatNumber(value)} / {formatNumber(target)} {unit}</div>
    </div>
  )
}

function hasNutrition(log) {
  return Number(log?.calories || 0) > 0
    || Number(log?.protein || 0) > 0
    || Number(log?.carbs || 0) > 0
    || Number(log?.fats || 0) > 0
}

function ChartTooltip({ active, payload, label, metricLabel, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--nl-surface)',
      border: '1px solid var(--nl-border)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: 'var(--nl-shadow)',
      fontFamily: 'var(--nl-font)',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--nl-text-sub)' }}>{label}</div>
      <div style={{ color: 'var(--nl-accent)', fontFamily: 'var(--nl-mono)', fontWeight: 700, fontSize: 15 }}>
        {formatNumber(payload[0].value)} {unit}
      </div>
      <div style={{ marginTop: 6, color: 'var(--nl-text-muted)', fontSize: 12.5 }}>
        {metricLabel}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [daily, setDaily] = useState(null)
  const [weekly, setWeekly] = useState([])
  const [streakLogs, setStreakLogs] = useState([])
  const [waterSaving, setWaterSaving] = useState(false)

  const [manualDesc, setManualDesc] = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFats, setManualFats] = useState('')
  const [manualSaving, setManualSaving] = useState(false)

  const [waterDeltaMl, setWaterDeltaMl] = useState('250')
  const [waterSetMl, setWaterSetMl] = useState('')

  const [chartMetricKey, setChartMetricKey] = useState('calories')
  const [chartMetricOpen, setChartMetricOpen] = useState(false)
  const chartMetricRef = useRef(null)

  const targets = useMemo(() => ({ ...DEFAULT_TARGETS, ...(userProfile?.targets || {}) }), [userProfile])
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')

    const { start: weekStart, end: weekEnd } = lastNDaysRange(7)
    const { start: streakStart, end: streakEnd } = lastNDaysRange(90)

    try {
      const [dailyLog, weeklyLogs, streakRange] = await Promise.all([
        getDailyLog({ userId: user.uid, dateKey: todayKey }),
        listLogsRange({ userId: user.uid, startDate: weekStart, endDate: weekEnd }),
        listLogsRange({ userId: user.uid, startDate: streakStart, endDate: streakEnd }),
      ])
      setDaily(dailyLog)
      setWeekly(weeklyLogs)
      setStreakLogs(streakRange)
    } catch (err) {
      setError(formatFirestoreError(err, 'Failed to load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [user, todayKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const weeklySeries = useMemo(() => {
    const { start } = lastNDaysRange(7)
    const base = new Map(weekly.map((d) => [d.dateKey, d]))
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      const key = toDateKey(date)
      const item = base.get(key)
      return {
        date: key.slice(5),
        calories: Math.round(item?.calories || 0),
        protein: Math.round(item?.protein || 0),
        carbs: Math.round(item?.carbs || 0),
        fats: Math.round(item?.fats || 0),
        waterMl: Math.round(item?.waterMl || 0),
      }
    })
  }, [weekly])

  const selectedMetric = useMemo(
    () => CHART_METRICS.find((m) => m.key === chartMetricKey) || CHART_METRICS[0],
    [chartMetricKey],
  )

  useEffect(() => {
    if (!chartMetricOpen) return

    function onDocClick(e) {
      const el = chartMetricRef.current
      if (!el) return
      if (!el.contains(e.target)) setChartMetricOpen(false)
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setChartMetricOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [chartMetricOpen])

  const onSelectChartMetric = useCallback((key) => {
    setChartMetricKey(key)
    setChartMetricOpen(false)
  }, [])

  const dailyTotals = useMemo(() => {
    const d = daily || {}
    return {
      calories: Math.round(d.calories || 0),
      protein: Math.round(d.protein || 0),
      carbs: Math.round(d.carbs || 0),
      fats: Math.round(d.fats || 0),
      waterMl: Math.round(d.waterMl || 0),
    }
  }, [daily])

  const consistency = useMemo(() => {
    const weekMap = new Map(weekly.map((d) => [d.dateKey, d]))
    const { start } = lastNDaysRange(7)
    const logged = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      return hasNutrition(weekMap.get(toDateKey(date)))
    }).filter(Boolean).length
    return Math.round((logged / 7) * 100)
  }, [weekly])

  const streakDays = useMemo(() => {
    const set = new Set(streakLogs.filter(hasNutrition).map((log) => log.dateKey))
    let streak = 0
    const cursor = new Date()

    while (true) {
      const key = toDateKey(cursor)
      if (!set.has(key)) break
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  }, [streakLogs])

  const updateWater = useCallback(async (nextWaterMl) => {
    if (!user) return
    setWaterSaving(true)
    setError('')
    try {
      await setDailyWater({ userId: user.uid, dateKey: todayKey, waterMl: nextWaterMl })
      setDaily((prev) => ({ ...(prev || {}), waterMl: nextWaterMl }))
    } catch (err) {
      setError(formatFirestoreError(err, 'Failed to update water intake'))
      return
    } finally {
      setWaterSaving(false)
    }

    // Ensure the UI reflects the canonical server state.
    refresh()
  }, [user, todayKey, refresh])

  const onAddManualMeal = useCallback(async () => {
    if (!user || manualSaving) return

    const calories = Number(manualCalories)
    const protein = Number(manualProtein)
    const carbs = Number(manualCarbs)
    const fats = Number(manualFats)

    if (![calories, protein, carbs, fats].some((n) => Number.isFinite(n) && n > 0)) {
      toast.error('Enter at least one macro value')
      return
    }

    setManualSaving(true)
    setError('')
    try {
      await addMeal({
        userId: user.uid,
        meal: {
          description: manualDesc.trim() || 'Manual entry',
          image: null,
          calories: Number.isFinite(calories) ? calories : 0,
          protein: Number.isFinite(protein) ? protein : 0,
          carbs: Number.isFinite(carbs) ? carbs : 0,
          fats: Number.isFinite(fats) ? fats : 0,
          healthScore: 0,
          suggestions: [],
        },
      })
      toast.success('Added to today')
      setManualDesc('')
      setManualCalories('')
      setManualProtein('')
      setManualCarbs('')
      setManualFats('')
      refresh()
    } catch (err) {
      setError(formatFirestoreError(err, 'Failed to add manual meal'))
    } finally {
      setManualSaving(false)
    }
  }, [
    user,
    manualSaving,
    manualDesc,
    manualCalories,
    manualProtein,
    manualCarbs,
    manualFats,
    refresh,
  ])

  const onAddWaterDelta = useCallback(async () => {
    const delta = Math.max(0, Math.round(Number(waterDeltaMl) || 0))
    await updateWater(dailyTotals.waterMl + delta)
  }, [waterDeltaMl, dailyTotals.waterMl, updateWater])

  const onSetWater = useCallback(async () => {
    const next = Math.max(0, Math.round(Number(waterSetMl) || 0))
    await updateWater(next)
  }, [waterSetMl, updateWater])

  return (
    <div className="nl-page">
      <div className="nl-dash-header nl-animate-fade-up">
        <div>
          <h1 className="nl-page-title">Dashboard</h1>
          <p className="nl-page-subtitle">Targets, macros, hydration, and consistency in one place.</p>
        </div>
        <Link className="nl-refresh-btn" to="/onboarding">Adjust targets</Link>
      </div>

      <ErrorBanner message={error} />

      <div className="nl-stats-grid">
        {STATS.map((s, i) => (
          <StatCard
            key={s.key}
            label={s.label}
            unit={s.unit}
            icon={s.icon}
            index={i}
            loading={loading}
            value={formatNumber(dailyTotals[s.key])}
          />
        ))}
      </div>

      <div className="nl-summary-grid">
        <Card className="nl-progress-card nl-animate-fade-up nl-stagger-2">
          <div className="nl-progress-header">
            <span className="nl-progress-title">Daily calorie goal</span>
            <button className="nl-refresh-btn" onClick={refresh} type="button">↻ Refresh</button>
          </div>
          <ProgressBar value={dailyTotals.calories} max={targets.calories} loading={loading} unit="kcal" />

          <div className="nl-macro-bars">
            <div>
              <div className="nl-progress-title">Protein</div>
              <ProgressBar value={dailyTotals.protein} max={targets.protein} loading={loading} unit="g" />
            </div>
            <div>
              <div className="nl-progress-title">Carbs</div>
              <ProgressBar value={dailyTotals.carbs} max={targets.carbs} loading={loading} unit="g" />
            </div>
            <div>
              <div className="nl-progress-title">Fats</div>
              <ProgressBar value={dailyTotals.fats} max={targets.fats} loading={loading} unit="g" />
            </div>
          </div>
        </Card>

        <Card className="nl-consistency-card nl-animate-fade-up nl-stagger-3">
          <div className="nl-progress-title">Consistency</div>
          <div className="nl-consistency-item">
            <span>Current streak</span>
            <strong>{streakDays} day{streakDays === 1 ? '' : 's'}</strong>
          </div>
          <div className="nl-consistency-item">
            <span>Weekly consistency</span>
            <strong>{consistency}%</strong>
          </div>
          <p className="nl-page-subtitle" style={{ marginTop: 10 }}>
            Consistency = days with at least one logged meal in the last 7 days.
          </p>
        </Card>
      </div>

      <Card className="nl-rings-card nl-animate-fade-up nl-stagger-3">
        <div className="nl-chart-header">
          <div className="nl-chart-title">Macro targets</div>
          <div className="nl-chart-sub">Visual completion rings</div>
        </div>
        <div className="nl-rings-grid">
          <MacroRing label="Protein" value={dailyTotals.protein} target={targets.protein} unit="g" color="#0ea5e9" />
          <MacroRing label="Carbs" value={dailyTotals.carbs} target={targets.carbs} unit="g" color="#f59e0b" />
          <MacroRing label="Fats" value={dailyTotals.fats} target={targets.fats} unit="g" color="#10b981" />
          <MacroRing label="Water" value={dailyTotals.waterMl} target={targets.waterMl} unit="ml" color="#3b82f6" />
        </div>
      </Card>

      <Card className="nl-water-card nl-animate-fade-up nl-stagger-4">
        <div className="nl-progress-header">
          <span className="nl-progress-title">Water intake</span>
          <span className="nl-page-subtitle">{formatNumber(dailyTotals.waterMl)} / {formatNumber(targets.waterMl)} ml</span>
        </div>
        <div className="nl-water-actions">
          <button className="nl-refresh-btn" disabled={waterSaving} onClick={() => updateWater(dailyTotals.waterMl + 250)} type="button">+250ml</button>
          <button className="nl-refresh-btn" disabled={waterSaving} onClick={() => updateWater(dailyTotals.waterMl + 500)} type="button">+500ml</button>
          <button className="nl-refresh-btn" disabled={waterSaving} onClick={() => updateWater(0)} type="button">Reset</button>
        </div>

        <div className="nl-water-manual">
          <div className="nl-water-manual-row">
            <Input
              label="Add water (ml)"
              type="number"
              inputMode="numeric"
              min={0}
              value={waterDeltaMl}
              onChange={(e) => setWaterDeltaMl(e.target.value)}
            />
            <Button type="button" variant="secondary" loading={waterSaving} disabled={waterSaving} onClick={onAddWaterDelta}>
              Add
            </Button>
          </div>

          <div className="nl-water-manual-row">
            <Input
              label="Set water total (ml)"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 2170"
              value={waterSetMl}
              onChange={(e) => setWaterSetMl(e.target.value)}
            />
            <Button type="button" variant="secondary" loading={waterSaving} disabled={waterSaving} onClick={onSetWater}>
              Set
            </Button>
          </div>
        </div>
      </Card>

      <Card className="nl-manual-card nl-animate-fade-up nl-stagger-4">
        <div className="nl-progress-header">
          <span className="nl-progress-title">Manual meal entry</span>
          <span className="nl-page-subtitle">Quick-add macros without the analyzer.</span>
        </div>

        <div className="nl-manual-grid">
          <Input
            label="Description"
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
            placeholder="e.g. Homemade sandwich"
          />
          <Input label="Calories (kcal)" type="number" inputMode="numeric" min={0} value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} />
          <Input label="Protein (g)" type="number" inputMode="numeric" min={0} value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} />
          <Input label="Carbs (g)" type="number" inputMode="numeric" min={0} value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} />
          <Input label="Fats (g)" type="number" inputMode="numeric" min={0} value={manualFats} onChange={(e) => setManualFats(e.target.value)} />
        </div>

        <div className="nl-manual-actions">
          <Button type="button" loading={manualSaving} disabled={manualSaving} onClick={onAddManualMeal}>
            {manualSaving ? 'Adding…' : 'Add to today'}
          </Button>
        </div>
      </Card>

      <Card className="nl-chart-card nl-animate-fade-up nl-stagger-3">
        <div className="nl-chart-header nl-chart-header-row">
          <div>
            <div className="nl-chart-title">Weekly {selectedMetric.label.toLowerCase()} intake</div>
            <div className="nl-chart-sub">Last 7 days</div>
          </div>

          <div className="nl-chart-controls">
            <div className="nl-chart-dropdown" ref={chartMetricRef}>
              <button
                type="button"
                className="nl-chart-dropdown-btn"
                onClick={() => setChartMetricOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={chartMetricOpen}
              >
                <span>{selectedMetric.label}</span>
                <span className="nl-chart-chevron" aria-hidden="true">▾</span>
              </button>

              {chartMetricOpen && (
                <div className="nl-chart-menu" role="menu">
                  {CHART_METRICS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      role="menuitem"
                      className={`nl-chart-menu-item${m.key === chartMetricKey ? ' nl-chart-menu-item-active' : ''}`}
                      onClick={() => onSelectChartMetric(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <Skeleton style={{ height: 220, width: '100%' }} />
        ) : (
          <ResponsiveContainer width="100%" height={220} minWidth={0} debounce={80}>
            <AreaChart data={weeklySeries} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--nl-accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--nl-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--nl-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--nl-text-muted)', fontFamily: 'var(--nl-font)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--nl-text-muted)', fontFamily: 'var(--nl-font)' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={(props) => (
                <ChartTooltip
                  {...props}
                  metricLabel={selectedMetric.label}
                  unit={selectedMetric.unit}
                />
              )} />
              <Area
                type="monotone"
                dataKey={selectedMetric.key}
                stroke="var(--nl-accent)"
                strokeWidth={2.5}
                fill="url(#metricGrad)"
                dot={{ fill: 'var(--nl-accent)', r: 3, strokeWidth: 0 }}
                activeDot={{ fill: 'var(--nl-accent)', r: 5, stroke: 'var(--nl-surface)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
