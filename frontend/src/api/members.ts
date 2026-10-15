import { mutate, request } from './http'
import type { PageResult } from '../types/blog'

export interface Member {
  id: number
  email: string | null
  nickname: string
  avatar: string
  bio: string
  status: 'ACTIVE' | 'MUTED' | 'BANNED' | 'DELETED'
  version: number
}
export interface OwnComment {
  id: number
  slug: string
  postTitle: string
  content: string
  status: string
  version: number
  createdAt: string
}
export interface Notice {
  id: number
  message: string
  slug: string
  commentId: number
  read: boolean
  createdAt: string
}
export interface Note {
  id: number
  memberId: number
  author: string
  content: string
  color: string
  status: string
  version: number
  createdAt: string
}
export interface Report {
  id: number
  memberId: number
  commentId: number
  reason: string
  content: string
  resolved: boolean
  createdAt: string
}
export const memberApi = {
  config: () => request<{ mailEnabled: boolean }>('/members/config'),
  me: () => request<Member>('/members/me'),
  session: () => request<Member | null>('/members/session'),
  publicProfile: (id: number) =>
    request<Pick<Member, 'id' | 'nickname' | 'avatar' | 'bio'>>(`/people/${id}`),
  email: (email: string, purpose: 'REGISTER' | 'RESET') =>
    mutate('/members/email', 'POST', { email, purpose }),
  register: (email: string, token: string, nickname: string, password: string) =>
    mutate<Member>('/members/register', 'POST', { email, token, nickname, password }),
  login: (email: string, password: string) =>
    mutate<Member>('/members/login', 'POST', { email, password }),
  logout: () => mutate('/auth/logout', 'POST'),
  reset: (email: string, token: string, password: string) =>
    mutate('/members/reset', 'POST', { email, token, password }),
  edit: (member: Member) => mutate<Member>('/members/me', 'PUT', member),
  password: (currentPassword: string, password: string) =>
    mutate('/members/password', 'PUT', { currentPassword, password }),
  close: (password: string) => mutate('/members/me', 'DELETE', { password }),
  comments: (page: number) => request<PageResult<OwnComment>>(`/members/comments?page=${page}`),
  deleteComment: (comment: OwnComment) =>
    mutate(`/members/comments/${comment.id}?version=${comment.version}`, 'DELETE'),
  notices: (page: number) => request<PageResult<Notice>>(`/members/notifications?page=${page}`),
  read: (id: number) => mutate(`/members/notifications/${id}`, 'PATCH'),
  report: (id: number, reason: string) => mutate(`/comments/${id}/reports`, 'POST', { reason }),
  list: (keyword: string, page: number) =>
    request<PageResult<Member>>(
      `/admin/members?${new URLSearchParams({ keyword, page: String(page) })}`,
    ),
  state: (member: Member, status: string) =>
    mutate(`/admin/members/${member.id}`, 'PATCH', { status, version: member.version }),
  reports: (page: number) => request<PageResult<Report>>(`/admin/reports?page=${page}`),
  resolve: (id: number) => mutate(`/admin/reports/${id}`, 'PATCH'),
  notes: (page: number, admin = false) =>
    request<PageResult<Note>>(`/${admin ? 'admin/' : ''}guestbook?page=${page}`),
  addNote: (content: string, color: string) => mutate('/guestbook', 'POST', { content, color }),
  ownNotes: (page: number) => request<PageResult<Note>>(`/members/guestbook?page=${page}`),
  noteState: (note: Note, status: string) =>
    mutate(`/admin/guestbook/${note.id}`, 'PATCH', { status, version: note.version }),
  deleteNote: (note: Note, admin = false) =>
    mutate(
      `/${admin ? 'admin' : 'members'}/guestbook/${note.id}?version=${note.version}`,
      'DELETE',
    ),
}
