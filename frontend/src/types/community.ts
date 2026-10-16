import type { PageResult } from './blog'
export interface Comment {
  id: number
  author: string
  content: string
  createdAt: string
  url?: string
  parentId?: number | null
  replyTo?: string | null
}
export interface AdminComment extends Comment {
  email: string
  slug: string
  postTitle: string
  version: number
}
export interface ReadingStatistics {
  totalReads: number
  todayReads: number
  totalComments: number
  daily: { date: string; count: number }[]
  posts: { id: number; slug: string; title: string; count: number }[]
}
export type CommentPage = PageResult<Comment>
