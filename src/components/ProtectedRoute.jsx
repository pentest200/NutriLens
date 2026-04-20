import { Navigate, Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function ProtectedRoute() {
  const { user, authReady, userProfile, profileReady } = useAuth()
  const location = useLocation()

  if (!authReady || !profileReady) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-sm text-slate-500">Loading session…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const onboarded = Boolean(userProfile?.onboardingComplete)
  const isOnboardingRoute = location.pathname === '/onboarding'

  if (!onboarded && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
