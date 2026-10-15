export interface MusicTrack {
  id: number
  title: string
  artist: string
  audioUrl: string
  cover: string
  sourceUrl: string
}
export interface MusicSettings {
  playlistId: string
  name: string
  profileUrl: string
  enabled: boolean
  version: number
  tracks: MusicTrack[]
}
export type MusicInput = Omit<MusicSettings, 'tracks'>
