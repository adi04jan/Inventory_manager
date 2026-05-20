import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, TOKEN_KEY } from './client'

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }) =>
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.token)
      qc.clear()
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      localStorage.removeItem(TOKEN_KEY)
      qc.clear()
      window.location.replace('/login')
    },
  })
}
