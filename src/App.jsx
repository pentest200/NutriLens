import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const AnalyzerPage  = lazy(() => import('./pages/AnalyzerPage.jsx'))
const HistoryPage   = lazy(() => import('./pages/HistoryPage.jsx'))
const LoginPage     = lazy(() => import('./pages/LoginPage.jsx'))
const SignupPage     = lazy(() => import('./pages/SignupPage.jsx'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'))
const NotFoundPage  = lazy(() => import('./pages/NotFoundPage.jsx'))

function PageFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60dvh',
      color: 'var(--nl-text-muted)',
      fontFamily: 'var(--nl-font)',
      fontSize: 14,
      gap: 10,
    }}>
      <span style={{
        width: 18,
        height: 18,
        border: '2px solid var(--nl-border)',
        borderTopColor: 'var(--nl-accent)',
        borderRadius: '50%',
        animation: 'nl-spin 0.7s linear infinite',
        display: 'inline-block',
      }} />
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index             element={<DashboardPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/analyze"   element={<AnalyzerPage />} />
            <Route path="/history"   element={<HistoryPage />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*"          element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
