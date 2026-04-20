import '../styles/SignupPage.css'
import '../styles/Card.css'
import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/Button.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { Input } from '../components/Input.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { formatFirebaseAuthError } from '../utils/firebaseAuthError.js'

export default function SignupPage() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => email.trim() && password.trim().length >= 6,
    [email, password],
  )

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!canSubmit || submitting) return
      setSubmitting(true)
      setError('')
      try {
        await signup({ email: email.trim(), password, displayName: displayName.trim() })
        toast.success('Account created 🎉')
        navigate('/', { replace: true })
      } catch (err) {
        setError(formatFirebaseAuthError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [canSubmit, submitting, signup, email, password, displayName, navigate],
  )

  if (user) return <Navigate to="/" replace />

  return (
    <div className="nl-signup-root">
      <div className="nl-signup-card nl-animate-fade-up">
        <div className="nl-signup-logo">
          <div className="nl-signup-logo-icon">🥗</div>
          <span className="nl-signup-logo-text">NutriLens</span>
        </div>

        <div className="nl-card" style={{ padding: '32px' }}>
          <div className="nl-signup-heading">
            <h1>Create your account</h1>
            <p>Start tracking your nutrition in minutes.</p>
          </div>

          <form className="nl-signup-form" onSubmit={onSubmit}>
            <ErrorBanner message={error} />
            <Input
              label="Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
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
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              required
            />

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={!canSubmit || submitting}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="nl-signup-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
