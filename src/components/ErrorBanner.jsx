import '../styles/ErrorBanner.css'

export function ErrorBanner({ title = 'Something went wrong', message }) {
  if (!message) return null
  return (
    <div className="nl-error-banner">
      <span className="nl-error-icon">⚠</span>
      <div className="nl-error-content">
        <div className="nl-error-title">{title}</div>
        <div className="nl-error-message">{message}</div>
      </div>
    </div>
  )
}
