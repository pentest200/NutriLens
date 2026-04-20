import '../styles/Skeleton.css'
import clsx from 'clsx'

export function Skeleton({ className, style }) {
  return <div className={clsx('nl-skeleton', className)} style={style} />
}
