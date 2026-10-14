import { request, demoMode } from './http'
import { demoPosts, demoFriends } from '../data/demo'
import type {
  Post,
  PostSummary,
  PostQuery,
  PageResult,
  Taxonomy,
  Friend,
  SiteStats,
} from '../types/blog'

function taxonomy(field: 'category' | 'tags'): Taxonomy[] {
  const counts = new Map<string, number>()
  demoPosts.forEach((post) =>
    (field === 'tags' ? post.tags : [post.category]).forEach((name) =>
      counts.set(name, (counts.get(name) || 0) + 1),
    ),
  )
  return [...counts].map(([name, count]) => ({ name, count }))
}
export const blogApi = {
  async neighbors(
    slug: string,
  ): Promise<{ previous: PostSummary | null; next: PostSummary | null }> {
    if (!demoMode) return request(`/posts/${encodeURIComponent(slug)}/neighbors`)
    const posts = [...demoPosts].sort(
        (a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.id - b.id,
      ),
      index = posts.findIndex((p) => p.slug === slug)
    return { previous: posts[index - 1] || null, next: posts[index + 1] || null }
  },
  async posts(query: PostQuery = {}): Promise<PageResult<PostSummary>> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    if (!demoMode) return request(`/posts?${params}`)
    const items = demoPosts.filter(
      (p) =>
        (!query.category || p.category === query.category) &&
        (!query.tag || p.tags.includes(query.tag)) &&
        (!query.keyword ||
          `${p.title} ${p.excerpt} ${p.content}`
            .toLowerCase()
            .includes(query.keyword.toLowerCase())),
    )
    const page = query.page || 1
    const size = query.size || 4
    return { items: items.slice((page - 1) * size, page * size), total: items.length, page, size }
  },
  async post(slug: string): Promise<Post> {
    if (!demoMode) return request(`/posts/${encodeURIComponent(slug)}`)
    const post = demoPosts.find((p) => p.slug === slug)
    if (!post) throw new Error('文章不存在')
    return post
  },
  async archives(): Promise<PostSummary[]> {
    return demoMode
      ? [...demoPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      : request('/archives')
  },
  async categories(): Promise<Taxonomy[]> {
    return demoMode ? taxonomy('category') : request('/categories')
  },
  async tags(): Promise<Taxonomy[]> {
    return demoMode ? taxonomy('tags') : request('/tags')
  },
  async friends(): Promise<Friend[]> {
    return demoMode ? demoFriends : request('/friends')
  },
  async stats(): Promise<SiteStats> {
    return demoMode
      ? {
          posts: demoPosts.length,
          categories: taxonomy('category').length,
          tags: taxonomy('tags').length,
        }
      : request('/site/stats')
  },
}
