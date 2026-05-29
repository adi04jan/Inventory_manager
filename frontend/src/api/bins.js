import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export function useBins() {
  return useQuery({
    queryKey: ['bins'],
    queryFn: () => apiFetch('/bins'),
    staleTime: 60_000,
  })
}

export function useBin(id) {
  return useQuery({
    queryKey: ['bin', id],
    queryFn: () => apiFetch(`/bins/${id}`),
    enabled: !!id,
  })
}
