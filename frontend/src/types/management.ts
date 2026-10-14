export interface ManagedTaxonomy {
  id: number
  name: string
  count: number
  version: number
}
export interface ManagedFriend {
  id: number
  name: string
  description: string
  url: string
  sortOrder: number
  visible: boolean
  version: number
}
export interface SiteSettings {
  name: string
  title: string
  subtitle: string
  author: string
  bio: string
  description: string
  aboutContent: string
  avatar: string
  publicUrl: string
  commentsEnabled: boolean
  version: number
}
