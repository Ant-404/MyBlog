import { request, mutate } from './http'
import type {
  AdminPost,
  AdminPostSummary,
  PostInput,
  PostOptions,
  PostStatus,
} from '../types/adminPost'
import type { PageResult } from '../types/blog'

export const adminPostsApi = {
  list: (page = 1, keyword = '', status = '') =>
    request<PageResult<AdminPostSummary>>(
      `/admin/posts?${new URLSearchParams({ page: String(page), size: '10', keyword, status })}`,
    ),
  detail: (id: number) => request<AdminPost>(`/admin/posts/${id}`),
  options: () => request<PostOptions>('/admin/posts/options'),
  create: (input: PostInput) => mutate<AdminPost>('/admin/posts', 'POST', input),
  update: (id: number, input: PostInput) => mutate<AdminPost>(`/admin/posts/${id}`, 'PUT', input),
  state: (id: number, status: PostStatus, pinned: boolean, version: number) =>
    mutate<AdminPost>(`/admin/posts/${id}/state`, 'PATCH', { status, pinned, version }),
  remove: (id: number, version: number) =>
    mutate<void>(`/admin/posts/${id}?version=${version}`, 'DELETE'),
}
