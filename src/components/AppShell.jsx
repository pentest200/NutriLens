import { Toaster } from 'react-hot-toast'
import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav.jsx'

export function AppShell() {
  return (
    <div style={{ minHeight: '100dvh' }}>
      <TopNav />
      <main className="nl-container" style={{ paddingTop: '36px' }}>
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'var(--nl-font)',
            fontSize: '13.5px',
            background: 'var(--nl-surface)',
            color: 'var(--nl-text-primary)',
            border: '1px solid var(--nl-border)',
            boxShadow: 'var(--nl-shadow)',
            borderRadius: '10px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: 'var(--nl-accent)', secondary: '#fff' },
          },
        }}
      />
    </div>
  )
}
