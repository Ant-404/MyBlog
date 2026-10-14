import type { PostSummary } from './blog'
export type PostStatus = 'DRAFT' | 'PUBLISHED'
export interface AdminPostSummary extends PostSummary {
  status: PostStatus
  version: number
  updatedAt: string
}
export interface AdminPost extends AdminPostSummary {
  content: string
}
export interface PostInput {
  title: string
  slug: string
  excerpt: string
  content: string
  cover: string
  category: string
  tags: string[]
  publishedAt: string
  readingMinutes: number
  pinned: boolean
  status: PostStatus
  version: number
}
export interface PostOptions {
  categories: string[]
  tags: string[]
}
