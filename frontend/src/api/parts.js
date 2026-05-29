import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export function useParts(filters = {}) {
  const params = new URLSearchParams()
  if (filters.q)        params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.package)  params.set('package', filters.package)
  if (filters.bin)      params.set('bin', filters.bin)
  if (filters.low)      params.set('low', 'true')
  if (filters.page)     params.set('page', filters.page)
  params.set('size', filters.size ?? 50)
  const qs = params.toString()
  return useQuery({
    queryKey: ['parts', filters],
    queryFn: () => apiFetch(`/parts${qs ? `?${qs}` : ''}`),
    staleTime: 30_000,
  })
}

export function usePart(id) {
  return useQuery({
    queryKey: ['part', id],
    queryFn: () => apiFetch(`/parts/${id}`),
    staleTime: 10_000,
    enabled: !!id,
  })
}

export function usePartEvents(id, page = 1) {
  return useQuery({
    queryKey: ['partEvents', id, page],
    queryFn: () => apiFetch(`/parts/${id}/events?page=${page}&size=20`),
    staleTime: 10_000,
    enabled: !!id,
  })
}

export function useCreatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => apiFetch('/parts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}

export function useUpdatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      apiFetch(`/parts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['part', id] })
      qc.invalidateQueries({ queryKey: ['parts'] })
    },
  })
}

export function useDeletePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiFetch(`/parts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}

export function useDispense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, qty, actor }) =>
      apiFetch(`/parts/${id}/dispense`, { method: 'POST', body: JSON.stringify({ qty, actor }) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['part', id] })
      qc.invalidateQueries({ queryKey: ['parts'] })
    },
  })
}

export function useAddStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, qty, cost }) =>
      apiFetch(`/parts/${id}/add-stock`, { method: 'POST', body: JSON.stringify({ qty, cost }) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['part', id] })
      qc.invalidateQueries({ queryKey: ['parts'] })
    },
  })
}
