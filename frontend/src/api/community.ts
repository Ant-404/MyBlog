import { request, mutate, demoMode } from './http'
import type { AdminComment, CommentPage, ReadingStatistics } from '../types/community'
import type { PageResult } from '../types/blog'
export const communityApi = {
  comments: (slug: string, page = 1): Promise<CommentPage> =>
    demoMode
      ? Promise.resolve({ items: [], total: 0, page, size: 20 })
      : request(`/posts/${encodeURIComponent(slug)}/comments?page=${page}`),
  submit: (slug: string, author: string, content: string, website: string, parentId?: number) =>
    mutate<void>(`/posts/${encodeURIComponent(slug)}/comments`, 'POST', {
      author,
      content,
      website,
      parentId,
    }),
  recordView: (slug: string) =>
    demoMode
      ? Promise.resolve(0)
      : mutate<number>(`/posts/${encodeURIComponent(slug)}/view`, 'POST'),
  commentsAdmin: (status: string, page: number) =>
    request<PageResult<AdminComment>>(
      `/admin/comments?${new URLSearchParams({ status, page: String(page) })}`,
    ),
  moderate: (comment: AdminComment, status: AdminComment['status']) =>
    mutate<void>(`/admin/comments/${comment.id}`, 'PATCH', { status, version: comment.version }),
  deleteComment: (comment: AdminComment) =>
    mutate<void>(`/admin/comments/${comment.id}?version=${comment.version}`, 'DELETE'),
  statistics: () => request<ReadingStatistics>('/admin/statistics'),
}
