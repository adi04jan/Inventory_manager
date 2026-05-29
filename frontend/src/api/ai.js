import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export function useAISuggest(pn) {
  return useQuery({
    queryKey: ['ai-suggest', pn],
    queryFn: () => apiFetch(`/ai/suggest?pn=${encodeURIComponent(pn)}`),
    enabled: !!pn && pn.trim().length >= 2,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
