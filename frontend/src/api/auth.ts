import { request, mutate } from './http'
import type { AdminUser, LoginInput, DashboardOverview } from '../types/auth'

export const authApi = {
  me: () => request<AdminUser>('/auth/me'),
  login: (input: LoginInput) => mutate<AdminUser>('/auth/login', 'POST', input),
  logout: () => mutate<void>('/auth/logout', 'POST'),
  dashboard: () => request<DashboardOverview>('/admin/dashboard'),
}
