const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api')
  : '/api'

const fallbackMessages = {
  413: 'The upload is too large. Remove an image or choose smaller images and try again.',
  502: 'The server is temporarily unavailable. Please try again in a moment.',
  503: 'The server is starting or temporarily unavailable. Please try again in a moment.',
}

async function send(path, options = {}, allowRefresh = true) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const publicAuthRequest = ['/auth/login', '/auth/register', '/auth/refresh'].includes(path)
  if (response.status === 401 && allowRefresh && !publicAuthRequest) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (refreshed.ok) return send(path, options, false)
    window.dispatchEvent(new Event('financial-platform-auth-expired'))
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.message ??
        fallbackMessages[response.status] ??
        `Request failed with status ${response.status}`,
    )
  }

  if (response.status === 204) return null
  return response.json()
}

export function apiRequest(path, options = {}) {
  return send(path, options)
}
