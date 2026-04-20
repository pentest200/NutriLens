import '../styles/Card.css'
import clsx from 'clsx'

export function Card({ className, accent = false, ...props }) {
  return (
    <div
      className={clsx('nl-card', accent && 'nl-card-accent', className)}
      {...props}
    />
  )
}
