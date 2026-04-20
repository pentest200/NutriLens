import '../styles/Input.css'
import clsx from 'clsx'

export function Textarea({ label, error, className, ...props }) {
  return (
    <label className={clsx('nl-field', className)}>
      {label && <span className="nl-field-label">{label}</span>}
      <textarea
        className={clsx('nl-textarea', error && 'nl-input-error')}
        {...props}
      />
      {error && <span className="nl-field-error-text">{error}</span>}
    </label>
  )
}
