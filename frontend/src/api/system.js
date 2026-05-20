import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch('/system/health'),
    refetchInterval: 30_000,
  })
}
