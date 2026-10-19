import tracks from 'virtual:local-music'
import type { MusicSettings } from '../types/music'
import { HttpError, mutate, request } from './http'
import { prepareImageUpload } from '../utils/imageUpload'

const localMusic: MusicSettings = {
  name: '耳边的小世界',
  enabled: true,
  tracks,
}
export const musicApi = {
  publicSettings: async () => {
    try {
      return await request<MusicSettings>('/music/local')
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return localMusic
      throw error
    }
  },
  adminSettings: async () => {
    try {
      return await request<MusicSettings>('/admin/music/local')
    } catch (error) {
      if (error instanceof HttpError && error.status === 404)
        throw new Error('本地音乐管理接口尚未启用，请更新并重启后端后重新加载')
      throw error
    }
  },
  save: (id: number, title: string, artist: string, version: number) =>
    mutate<MusicSettings>(`/admin/music/local/${id}`, 'PUT', { title, artist, version }),
  upload: (file: File) => upload('/admin/music/local', file),
  visibility: (id: number, version: number, hidden: boolean) =>
    mutate<MusicSettings>(`/admin/music/local/${id}/visibility`, 'PUT', { version, hidden }),
  reorder: (tracks: { id: number; version?: number }[]) =>
    mutate<MusicSettings>(
      '/admin/music/local/order',
      'PUT',
      tracks.map((track) => ({ id: track.id, version: track.version || 0 })),
    ),
  cover: async (id: number, version: number, file: File) =>
    upload(
      `/admin/music/local/${id}/cover?version=${version}`,
      await prepareImageUpload(file, () => {}),
    ),
}

async function upload(path: string, file: File) {
  const csrf = await request<{ token: string; headerName: string }>('/auth/csrf')
  const body = new FormData()
  body.append('file', file)
  try {
    return await request<MusicSettings>(path, {
      method: 'POST',
      headers: { [csrf.headerName]: csrf.token },
      body,
      signal: AbortSignal.timeout(120000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError')
      throw new Error('上传等待超时，请刷新列表确认后再重试')
    throw error
  }
}

export function notifyMusicUpdated() {
  window.dispatchEvent(new Event('music-settings-updated'))
  try {
    localStorage.setItem('myblog-music-updated', String(Date.now()))
  } catch {
    /* Optional cross-tab notification. */
  }
}
