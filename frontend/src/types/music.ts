export interface MusicTrack {
  id: number
  title: string
  artist: string
  audioUrl: string
  cover: string
  version?: number
}
export interface MusicSettings {
  name: string
  enabled: boolean
  tracks: MusicTrack[]
}
