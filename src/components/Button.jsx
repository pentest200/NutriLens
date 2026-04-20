import '../styles/Button.css'
import { createElement } from 'react'
import clsx from 'clsx'

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  ...props
}) {
  return createElement(Component, {
    className: clsx(
      'nl-btn',
      `nl-btn-${variant}`,
      `nl-btn-${size}`,
      className,
    ),
    ...props,
  }, loading ? (
    <>
      <span className="nl-btn-spinner" />
      {children}
    </>
  ) : children)
}
