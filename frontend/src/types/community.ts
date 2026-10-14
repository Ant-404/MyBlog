import type { PageResult } from './blog'
export interface Comment {
  id: number
  author: string
  content: string
  createdAt: string
}
export interface AdminComment extends Comment {
  slug: string
  postTitle: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  version: number
}
export interface ReadingStatistics {
  totalReads: number
  todayReads: number
  pendingComments: number
  daily: { date: string; count: number }[]
  posts: { id: number; slug: string; title: string; count: number }[]
}
export type CommentPage = PageResult<Comment>
