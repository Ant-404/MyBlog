import { request, mutate } from './http'
import type { AdminUser, LoginInput } from '../types/auth'
import type { SiteStats } from '../types/blog'

export const authApi = {
  me: () => request<AdminUser>('/auth/me'),
  login: (input: LoginInput) => mutate<AdminUser>('/auth/login', 'POST', input),
  logout: () => mutate<void>('/auth/logout', 'POST'),
  dashboard: () => request<SiteStats>('/admin/dashboard'),
}
