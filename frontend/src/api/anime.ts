import { demoMode, mutate, request } from './http'
import type { AnimeEntry } from '../types/anime'

export const animeApi = {
  list: () => (demoMode ? Promise.resolve<AnimeEntry[]>([]) : request<AnimeEntry[]>('/anime')),
  adminList: () => request<AnimeEntry[]>('/admin/anime'),
  save: (input: Omit<AnimeEntry, 'id'>, id?: number) =>
    mutate<void>(`/admin/anime${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input),
  delete: (item: AnimeEntry) =>
    mutate<void>(`/admin/anime/${item.id}?version=${item.version}`, 'DELETE'),
}
