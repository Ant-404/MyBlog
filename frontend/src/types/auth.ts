export interface AdminUser {
  username: string
  displayName: string
}
export interface LoginInput {
  username: string
  password: string
}

export interface DashboardOverview {
  posts: number
  categories: number
  tags: number
  drafts: number
  scheduled: number
  albums: number
  photos: number
  comments: number
  notes: number
  media: number
  projects: number
  series: number
  anime: number
}
