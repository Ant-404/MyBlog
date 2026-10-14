import { request, mutate } from './http'
import type { ManagedFriend, ManagedTaxonomy, SiteSettings } from '../types/management'
export type TaxonomyKind = 'categories' | 'tags'
export const managementApi = {
  taxonomy: (kind: TaxonomyKind) => request<ManagedTaxonomy[]>(`/admin/taxonomy/${kind}`),
  saveTaxonomy: (kind: TaxonomyKind, input: { name: string; version: number }, id?: number) =>
    mutate<void>(`/admin/taxonomy/${kind}${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input),
  deleteTaxonomy: (kind: TaxonomyKind, item: ManagedTaxonomy) =>
    mutate<void>(`/admin/taxonomy/${kind}/${item.id}?version=${item.version}`, 'DELETE'),
  friends: () => request<ManagedFriend[]>('/admin/friends'),
  saveFriend: (input: Omit<ManagedFriend, 'id'>, id?: number) =>
    mutate<void>(`/admin/friends${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input),
  deleteFriend: (item: ManagedFriend) =>
    mutate<void>(`/admin/friends/${item.id}?version=${item.version}`, 'DELETE'),
  settings: () => request<SiteSettings>('/admin/settings'),
  saveSettings: (input: SiteSettings) => mutate<SiteSettings>('/admin/settings', 'PUT', input),
}
