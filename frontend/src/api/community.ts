import { request, mutate, demoMode } from './http'
import type { AdminComment, CommentPage, ReadingStatistics } from '../types/community'
import type { PageResult } from '../types/blog'
export const communityApi = {
  comments: (slug: string, page = 1): Promise<CommentPage> =>
    demoMode
      ? Promise.resolve({ items: [], total: 0, page, size: 20 })
      : request(`/posts/${encodeURIComponent(slug)}/comments?page=${page}`),
  submit: (
    slug: string,
    input: {
      author: string
      email: string
      url: string
      content: string
      website: string
      parentId?: number
    },
  ) => mutate<void>(`/posts/${encodeURIComponent(slug)}/comments`, 'POST', input),
  recordView: (slug: string) =>
    demoMode
      ? Promise.resolve(0)
      : mutate<number>(`/posts/${encodeURIComponent(slug)}/view`, 'POST'),
  commentsAdmin: (page: number) =>
    request<PageResult<AdminComment>>(`/admin/comments?page=${page}`),
  deleteComment: (comment: AdminComment) =>
    mutate<void>(`/admin/comments/${comment.id}?version=${comment.version}`, 'DELETE'),
  statistics: () => request<ReadingStatistics>('/admin/statistics'),
}
