import { request, mutate } from './http'
import type { AdminUser, LoginInput, DashboardOverview } from '../types/auth'

export const authApi = {
  me: () => request<AdminUser>('/auth/me'),
  login: (input: LoginInput) => mutate<AdminUser>('/auth/login', 'POST', input),
  logout: () => mutate<void>('/auth/logout', 'POST'),
  changePassword: (currentPassword: string, newPassword: string) =>
    mutate<void>('/auth/password', 'POST', { currentPassword, newPassword }),
  dashboard: () => request<DashboardOverview>('/admin/dashboard'),
}
