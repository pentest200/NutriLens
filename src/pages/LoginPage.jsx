import '../styles/LoginPage.css'
import '../styles/Button.css'
import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/Button.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { Input } from '../components/Input.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { formatFirebaseAuthError } from '../utils/firebaseAuthError.js'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password])

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!canSubmit || submitting) return
      setSubmitting(true)
      setError('')
      try {
        await login({ email: email.trim(), password })
        toast.success('Welcome back 👋')
        navigate('/', { replace: true })
      } catch (err) {
        setError(formatFirebaseAuthError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [canSubmit, submitting, login, email, password, navigate],
  )

  if (user) return <Navigate to="/" replace />

  return (
    <div className="nl-auth-root">
      {/* Left hero panel */}
      <div className="nl-auth-hero">
        <div className="nl-hero-logo nl-animate-fade-up">
          <div className="nl-hero-logo-icon">🥗</div>
          <span className="nl-hero-logo-text">NutriLens</span>
        </div>

        <div className="nl-hero-tagline nl-animate-fade-up nl-stagger-1">
          <h1>Know exactly what you eat.</h1>
          <p>
            AI-powered nutrition analysis for every meal — fast, accurate,
            and built around your goals.
          </p>
          <ul className="nl-hero-features">
            <li>
              <div className="nl-hero-feature-dot">✦</div>
              Instant AI meal analysis from text or photo
            </li>
            <li>
              <div className="nl-hero-feature-dot">✦</div>
              Daily calorie &amp; macro tracking
            </li>
            <li>
              <div className="nl-hero-feature-dot">✦</div>
              Weekly trends &amp; healthier alternatives
            </li>
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="nl-auth-panel">
        <div className="nl-auth-form-wrap nl-animate-fade-up nl-stagger-2">
          <div className="nl-auth-form-heading">
            <h2>Welcome back</h2>
            <p>Sign in to continue tracking your nutrition.</p>
          </div>

          <form className="nl-auth-form" onSubmit={onSubmit}>
            <ErrorBanner message={error} />
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={!canSubmit || submitting}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="nl-auth-footer" style={{ marginTop: '24px' }}>
            No account?{' '}
            <Link to="/signup">Create one for free</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
