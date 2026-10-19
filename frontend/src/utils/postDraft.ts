import type { PostInput } from '../types/adminPost'

export interface LocalDraft {
  form: PostInput
  savedAt: string
}
export const draftKey = (owner: string, id?: string) => `myblog-draft:${owner}:${id || 'new'}`
export function readDraft(key: string): LocalDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    if (!value || typeof value.savedAt !== 'string' || !value.form) return null
    const form = value.form
    if (
      !['title', 'slug', 'excerpt', 'content', 'cover', 'category', 'publishedAt'].every(
        (k) => typeof form[k] === 'string',
      ) ||
      !Array.isArray(form.tags) ||
      !form.tags.every((tag: unknown) => typeof tag === 'string') ||
      !['DRAFT', 'PUBLISHED'].includes(form.status) ||
      typeof form.version !== 'number' ||
      typeof form.pinned !== 'boolean' ||
      typeof form.readingMinutes !== 'number'
    )
      return null
    return value
  } catch {
    return null
  }
}
