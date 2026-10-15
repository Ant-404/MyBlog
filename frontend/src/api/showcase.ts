import { request, mutate, demoMode } from './http'
import type { PageResult } from '../types/blog'
import type { ShowcaseEntry, ShowcaseInput, ShowcaseSection } from '../types/showcase'

export const showcaseApi = {
  list: (section: ShowcaseSection, page = 1, keyword = '', admin = false) =>
    demoMode && !admin
      ? Promise.resolve<PageResult<ShowcaseEntry>>({ items: [], total: 0, page, size: 12 })
      : request<PageResult<ShowcaseEntry>>(
          `/${admin ? 'admin/' : ''}${section}?${new URLSearchParams({ page: String(page), size: '12', keyword })}`,
        ),
  detail: (section: ShowcaseSection, id: number) => request<ShowcaseEntry>(`/${section}/${id}`),
  save: (section: ShowcaseSection, input: ShowcaseInput, id?: number) =>
    mutate<ShowcaseEntry>(`/admin/${section}${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input),
  remove: (section: ShowcaseSection, id: number, version: number) =>
    mutate<void>(`/admin/${section}/${id}?version=${version}`, 'DELETE'),
}
