export function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10
}

export function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num))
}

export function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

export function formatMacro(value, unit = 'g') {
  const n = Number(value)
  if (!Number.isFinite(n)) return `0${unit}`
  return `${Math.round(n)}${unit}`
}
