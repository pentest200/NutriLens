import '../styles/Button.css'
import '../styles/TopNav.css'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useTheme } from '../hooks/useTheme.js'
import clsx from 'clsx'

function AppNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx('nl-navlink', isActive && 'nl-navlink-active')
      }
    >
      {children}
    </NavLink>
  )
}

export function TopNav() {
  const { user, logout, deleteAccount, reauthenticateWithPassword } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const settingsRef = useRef(null)

  const initials = useMemo(() => {
    if (!user) return '?'
    const name = user.displayName || user.email || ''
    return name.slice(0, 2).toUpperCase()
  }, [user])

  const displayName = useMemo(() => {
    if (!user) return ''
    return user.displayName || user.email || 'Account'
  }, [user])

  const onLogout = useCallback(async () => {
    setSettingsOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const onDeleteAccount = useCallback(async () => {
    if (!user || deleting) return

    const ok = window.confirm(
      'Delete your account? This permanently deletes your NutriLens data (history, templates, targets).',
    )
    if (!ok) return

    const typed = window.prompt('Type DELETE to confirm account deletion:')
    if (typed !== 'DELETE') return

    const password = window.prompt(
      'For security, please enter your password to delete your account:',
    )
    if (!password) return

    setDeleting(true)
    try {
      setSettingsOpen(false)
      await reauthenticateWithPassword({ password })
      await deleteAccount()
      navigate('/signup', { replace: true })
    } catch (err) {
      const msg =
        err?.code === 'auth/requires-recent-login'
          ? 'Please sign in again, then try deleting your account.'
          : err?.message || 'Failed to delete account.'
      window.alert(msg)
    } finally {
      setDeleting(false)
    }
  }, [deleteAccount, deleting, navigate, reauthenticateWithPassword, user])

  useEffect(() => {
    if (!settingsOpen) return

    function onDocClick(e) {
      if (!settingsRef.current) return
      if (!settingsRef.current.contains(e.target)) setSettingsOpen(false)
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setSettingsOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [settingsOpen])

  const navLinks = (
    <nav className="nl-nav">
      <AppNavLink to="/">Dashboard</AppNavLink>
      <AppNavLink to="/analyze">Analyze</AppNavLink>
      <AppNavLink to="/history">History</AppNavLink>
      <AppNavLink to="/onboarding">Setup</AppNavLink>
    </nav>
  )

  return (
    <header className="nl-topnav">
      <div className="nl-container nl-topnav-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="nl-logo">
            <div className="nl-logo-icon">🥗</div>
            <span className="nl-logo-text">NutriLens</span>
          </div>
          {navLinks}
        </div>

        <div className="nl-topnav-right">
          <button
            className="nl-theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user && (
            <>
              <div className="nl-user-chip">
                <div className="nl-avatar">{initials}</div>
                <span>{displayName}</span>
              </div>
              <div className="nl-settings" ref={settingsRef}>
                <button
                  type="button"
                  className="nl-btn nl-btn-ghost nl-btn-sm"
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={settingsOpen}
                  style={{ fontFamily: 'var(--nl-font)' }}
                >
                  Settings ▾
                </button>

                {settingsOpen && (
                  <div className="nl-settings-menu" role="menu">
                    <button
                      type="button"
                      className="nl-settings-item"
                      role="menuitem"
                      onClick={onLogout}
                    >
                      Sign out
                    </button>
                    <button
                      type="button"
                      className="nl-settings-item nl-settings-item-danger"
                      role="menuitem"
                      onClick={onDeleteAccount}
                      disabled={deleting}
                      title={deleting ? 'Deleting…' : 'Delete account'}
                    >
                      {deleting ? 'Deleting…' : 'Delete account'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="nl-container">
        <nav className="nl-mobile-nav">
          <AppNavLink to="/">Dashboard</AppNavLink>
          <AppNavLink to="/analyze">Analyze</AppNavLink>
          <AppNavLink to="/history">History</AppNavLink>
          <AppNavLink to="/onboarding">Setup</AppNavLink>
        </nav>
      </div>
    </header>
  )
}
