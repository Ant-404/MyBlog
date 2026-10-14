import { request, mutate } from './http'
import type { MediaFile } from '../types/media'

export const mediaApi = {
  list: () => request<MediaFile[]>('/admin/media'),
  remove: (id: number) => mutate<void>(`/admin/media/${id}`, 'DELETE'),
  async upload(file: File): Promise<MediaFile> {
    if (file.size > 5 * 1024 * 1024) throw new Error('图片不能超过 5MB')
    const csrf = await request<{ token: string; headerName: string }>('/auth/csrf')
    const body = new FormData()
    body.append('file', file)
    return request('/admin/media', {
      method: 'POST',
      headers: { [csrf.headerName]: csrf.token },
      body,
    })
  },
}
