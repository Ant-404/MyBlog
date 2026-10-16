import { mutate, request } from './http'
import type { PageResult } from '../types/blog'
export interface Note {
  id: number
  author: string
  content: string
  color: string
  version: number
  createdAt: string
}
export const guestbookApi = {
  highlights: (mode: 'latest' | 'random') => request<Note[]>(`/guestbook/highlights?mode=${mode}`),
  notes: (page: number, admin = false) =>
    request<PageResult<Note>>(`/${admin ? 'admin/' : ''}guestbook?page=${page}`),
  addNote: (content: string, color: string, website = '') =>
    mutate('/guestbook', 'POST', { content, color, website }),
  deleteNote: (note: Note) =>
    mutate(`/admin/guestbook/${note.id}?version=${note.version}`, 'DELETE'),
}
