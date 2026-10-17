import { request, mutate } from './http'
import type { PageResult } from '../types/blog'
import type { MediaFile } from '../types/media'
import { prepareImageUpload, prepareCommentImage } from '../utils/imageUpload'

export const mediaApi = {
  async uploadCommentImage(file: File): Promise<MediaFile> {
    const prepared = await prepareCommentImage(file)
    const csrf = await request<{ token: string; headerName: string }>('/auth/csrf')
    const body = new FormData()
    body.append('file', prepared)
    return request<MediaFile>('/comments/images', {
      method: 'POST',
      headers: { [csrf.headerName]: csrf.token },
      body,
      signal: AbortSignal.timeout(60000),
    })
  },
  list: () => request<MediaFile[]>('/admin/media'),
  page: (page = 1, keyword = '') =>
    request<PageResult<MediaFile>>(
      `/admin/media/page?${new URLSearchParams({ page: String(page), keyword })}`,
    ),
  remove: (id: number) => mutate<void>(`/admin/media/${id}`, 'DELETE'),
  async upload(
    file: File,
    onPhase?: (phase: 'converting' | 'uploading') => void,
  ): Promise<MediaFile> {
    const prepared = await prepareImageUpload(file, () => onPhase?.('converting'))
    onPhase?.('uploading')
    const csrf = await request<{ token: string; headerName: string }>('/auth/csrf')
    const body = new FormData()
    body.append('file', prepared)
    try {
      return await request('/admin/media', {
        method: 'POST',
        headers: { [csrf.headerName]: csrf.token },
        body,
        signal: AbortSignal.timeout(60000),
      })
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'TimeoutError')
        throw new Error('上传等待超时，请刷新图片列表确认是否已上传成功')
      throw cause
    }
  },
}
