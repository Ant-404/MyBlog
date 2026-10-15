export const animeStatuses = {
  WATCHING: '在看',
  PLANNED: '想看',
  COMPLETED: '看完',
  ON_HOLD: '搁置',
  DROPPED: '弃番',
} as const
export type AnimeStatus = keyof typeof animeStatuses
export interface AnimeEntry {
  id: number
  title: string
  cover: string
  status: AnimeStatus
  watchedEpisodes: number
  totalEpisodes: number
  score: number
  note: string
  sourceUrl: string
  sortOrder: number
  visible: boolean
  version: number
}
