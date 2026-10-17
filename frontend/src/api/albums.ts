import { demoMode, mutate, request } from './http'
import type { Album, AlbumInput } from '../types/album'
export const albumsApi = {
  list: (keyword = '') =>
    demoMode
      ? Promise.resolve<Album[]>([])
      : request<Album[]>(`/albums?${new URLSearchParams({ keyword })}`),
  detail: (id: string) => request<Album>(`/albums/${encodeURIComponent(id)}`),
  adminList: () => request<Album[]>('/admin/albums'),
  adminDetail: (id: number) => request<Album>(`/admin/albums/${id}`),
  save: (input: AlbumInput, id?: number) =>
    mutate<Album>(`/admin/albums${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input),
  remove: (album: Album) =>
    mutate<void>(`/admin/albums/${album.id}?version=${album.version}`, 'DELETE'),
}
