import { demoMode, mutate, request } from './http'
import type { MusicInput, MusicSettings } from '../types/music'

export const emptyMusic: MusicSettings = {
  playlistId: '',
  name: '耳边的小世界',
  profileUrl: '',
  enabled: false,
  version: 0,
  tracks: [],
}
export const musicApi = {
  clear: (version: number) => mutate<MusicSettings>(`/admin/music?version=${version}`, 'DELETE'),
  publicSettings: () => (demoMode ? Promise.resolve(emptyMusic) : request<MusicSettings>('/music')),
  adminSettings: () => request<MusicSettings>('/admin/music'),
  save: (input: MusicInput, importTracks: boolean) =>
    mutate<MusicSettings>(
      `/admin/music${importTracks ? '/import' : ''}`,
      importTracks ? 'POST' : 'PUT',
      input,
    ),
}
