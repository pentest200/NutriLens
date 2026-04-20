const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function analyzeMeal({ description, imageDataUrl, signal }) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, imageDataUrl }),
    signal,
  })

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''
    let message = ''

    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null)
      if (data && typeof data === 'object') {
        const error = typeof data.error === 'string' ? data.error : ''
        const detail = typeof data.message === 'string' ? data.message : ''
        message = detail ? `${error || 'Request failed'}: ${detail}` : error
      }
    }

    if (!message) {
      message = await res.text().catch(() => '')
    }

    throw new Error(message || `Analyze failed (${res.status})`)
  }

  return res.json()
}
