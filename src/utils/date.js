import { addDays, endOfDay, format, startOfDay, subDays } from 'date-fns'

export function toDateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function startOfLocalDay(date) {
  return startOfDay(date)
}

export function endOfLocalDay(date) {
  return endOfDay(date)
}

export function lastNDaysRange(n, now = new Date()) {
  const end = endOfDay(now)
  const start = startOfDay(subDays(now, n - 1))
  return { start, end }
}

export function nextDay(date) {
  return addDays(date, 1)
}
