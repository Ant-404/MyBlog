export type ShowcaseSection = 'projects' | 'series' | 'moments'
export interface LinkedPost {
  id: number
  title: string
  slug: string
  published: boolean
}
export interface ShowcaseEntry {
  id: number
  section: ShowcaseSection
  title: string
  summary: string
  content: string
  cover: string
  status: string
  technologies: string[]
  sourceUrl: string
  demoUrl: string
  images: string[]
  posts: LinkedPost[]
  publishedAt: string
  sortOrder: number
  visible: boolean
  version: number
}
export type ShowcaseInput = Omit<ShowcaseEntry, 'id' | 'section' | 'posts'> & { postIds: number[] }
export const showcaseLabels = { projects: '项目展示', series: '文章专题', moments: '说说' }
export const showcaseStates: Record<ShowcaseSection, Record<string, string>> = {
  projects: { IN_PROGRESS: '进行中', COMPLETED: '已完成', ARCHIVED: '已归档' },
  series: { ONGOING: '连载中', COMPLETED: '已完结' },
  moments: {},
}
