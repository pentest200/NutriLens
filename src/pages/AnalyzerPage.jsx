import '../styles/AnalyzerPage.css'
import { useCallback, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { Textarea } from '../components/Textarea.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { analyzeMeal } from '../services/api.js'
import { addMeal } from '../services/db.js'
import { formatNumber } from '../utils/format.js'

export default function AnalyzerPage() {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const abortRef = useRef(null)

  const [description, setDescription] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const canAnalyze = useMemo(
    () => description.trim().length > 0 && !loading,
    [description, loading],
  )

  const pickImage = useCallback(() => fileRef.current?.click(), [])

  const clearImage = useCallback(() => {
    setImageDataUrl('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 1_000_000) { toast.error('Image must be under 1 MB'); return }
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(String(reader.result || ''))
    reader.readAsDataURL(file)
  }, [])

  const onAnalyze = useCallback(async () => {
    if (!canAnalyze) return
    abortRef.current?.abort?.()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await analyzeMeal({
        description: description.trim(),
        imageDataUrl: imageDataUrl || undefined,
        signal: controller.signal,
      })
      setResult(data)
      toast.success('Meal analyzed ✓')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [canAnalyze, description, imageDataUrl])

  const onSave = useCallback(async () => {
    if (!user || !result || saving) return
    setSaving(true)
    try {
      await addMeal({
        userId: user.uid,
        meal: {
          description: description.trim(),
          image: null,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fats,
          healthScore: result.healthScore,
          suggestions: result.suggestions,
        },
      })
      toast.success('Saved to history ✓')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [user, result, saving, description])

  const onClear = useCallback(() => {
    setDescription('')
    clearImage()
    setResult(null)
    setError('')
  }, [clearImage])

  return (
    <div className="nl-page">
      {/* Page header */}
      <div className="nl-animate-fade-up">
        <h1 className="nl-page-title">Meal Analyzer</h1>
        <p className="nl-page-subtitle">
          Describe your meal — optionally add a photo — to get instant nutrition estimates.
        </p>
      </div>

      <div className="nl-analyzer-grid">
        {/* ── Input card ── */}
        <Card className="nl-input-card nl-animate-fade-up nl-stagger-1">
          <div className="nl-card-section-title" style={{ marginBottom: 16 }}>Meal details</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Textarea
              label="Meal description"
              rows={6}
              placeholder="e.g. Chicken burrito bowl with rice, black beans, guacamole, and salsa"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Image section */}
            <div className="nl-image-section">
              <span className="nl-field-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--nl-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Photo (optional)
              </span>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onFileChange}
              />

              {imageDataUrl ? (
                <div className="nl-image-preview">
                  <img src={imageDataUrl} alt="Meal preview" />
                  <div className="nl-image-overlay">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={clearImage}
                    >
                      ✕ Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pickImage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '20px',
                    border: '2px dashed var(--nl-border)',
                    borderRadius: 'var(--nl-radius)',
                    background: 'transparent',
                    color: 'var(--nl-text-muted)',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'border-color var(--nl-transition), color var(--nl-transition)',
                    fontFamily: 'var(--nl-font)',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--nl-accent)'; e.currentTarget.style.color = 'var(--nl-accent)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--nl-border)'; e.currentTarget.style.color = 'var(--nl-text-muted)' }}
                >
                  <span style={{ fontSize: 20 }}>📷</span>
                  <span>Click to upload a photo</span>
                </button>
              )}
            </div>

            <ErrorBanner message={error} />

            <div className="nl-action-bar">
              <Button
                type="button"
                size="md"
                loading={loading}
                onClick={onAnalyze}
                disabled={!canAnalyze}
              >
                {loading ? 'Analyzing…' : '✦ Analyze meal'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClear}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Result card ── */}
        <Card className="nl-result-card nl-animate-fade-up nl-stagger-2">
          <div className="nl-card-section-title" style={{ marginBottom: 16 }}>Nutrition results</div>

          {loading ? (
            <div className="nl-result-skeletons">
              <Skeleton style={{ height: 80, width: '100%' }} />
              <Skeleton style={{ height: 80, width: '100%' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Skeleton style={{ height: 70 }} />
                <Skeleton style={{ height: 70 }} />
                <Skeleton style={{ height: 70 }} />
                <Skeleton style={{ height: 70 }} />
              </div>
              <Skeleton style={{ height: 100, width: '100%' }} />
            </div>
          ) : result ? (
            <div className="nl-animate-fade-in">
              {/* Macro grid */}
              <div className="nl-macro-grid">
                <div className="nl-macro-item nl-macro-calories">
                  <div className="nl-macro-label">Calories</div>
                  <div className="nl-macro-value">
                    {formatNumber(result.calories)}
                    <span className="nl-macro-unit">kcal</span>
                  </div>
                </div>
                {[
                  { label: 'Protein', val: result.protein },
                  { label: 'Carbs',   val: result.carbs },
                  { label: 'Fats',    val: result.fats },
                  { label: 'Health',  val: result.healthScore, unit: '/ 100', noUnit: false },
                ].map(({ label, val, unit }) => (
                  <div key={label} className="nl-macro-item">
                    <div className="nl-macro-label">{label}</div>
                    <div className="nl-macro-value">
                      {formatNumber(val)}
                      <span className="nl-macro-unit">{unit || 'g'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {result.suggestions?.length > 0 && (
                <div className="nl-suggestions">
                  <div className="nl-suggestions-title">💡 Suggestions</div>
                  <ul className="nl-suggestions-list">
                    {result.suggestions.map((s, idx) => (
                      <li key={idx}>
                        <span className="nl-suggestion-bullet">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                type="button"
                size="md"
                loading={saving}
                onClick={onSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : '↓ Save & add'}
              </Button>
            </div>
          ) : (
            <div className="nl-result-empty">
              <div className="nl-result-empty-icon">🍽️</div>
              <div className="nl-result-empty-text">
                Describe your meal and click <strong>Analyze</strong> to see calories and macros here.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
