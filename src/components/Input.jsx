import '../styles/Input.css'
import clsx from 'clsx'

export function Input({ label, error, className, ...props }) {
  return (
    <label className={clsx('nl-field', className)}>
      {label && <span className="nl-field-label">{label}</span>}
      <input
        className={clsx('nl-input', error && 'nl-input-error')}
        {...props}
      />
      {error && <span className="nl-field-error-text">{error}</span>}
    </label>
  )
}
