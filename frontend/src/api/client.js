export const TOKEN_KEY = 'bindex_token'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { headers, ...options })

  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem(TOKEN_KEY)
    window.location.replace('/login')
    throw { status: 401, message: 'Session expired' }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, message: body.detail ?? res.statusText, ...body }
  }
  if (res.status === 204) return null
  return res.json()
}
