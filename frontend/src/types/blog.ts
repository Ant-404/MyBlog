export interface PostSummary {
  id: number
  slug: string
  title: string
  excerpt: string
  cover: string
  category: string
  tags: string[]
  publishedAt: string
  readingMinutes: number
  pinned: boolean
}
export interface Post extends PostSummary {
  content: string
}
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}
export interface Taxonomy {
  name: string
  count: number
}
export interface Friend {
  id: number
  name: string
  description: string
  url: string
}
export interface SiteStats {
  posts: number
  categories: number
  tags: number
}
export interface PostQuery {
  page?: number
  size?: number
  keyword?: string
  category?: string
  tag?: string
}
