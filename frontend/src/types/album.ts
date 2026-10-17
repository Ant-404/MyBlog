export interface AlbumPhoto {
  url: string
  caption: string
}
export interface AlbumInput {
  title: string
  description: string
  cover: string
  sortOrder: number
  visible: boolean
  version: number
  photos: AlbumPhoto[]
}
export interface Album extends AlbumInput {
  id: number
  photoCount: number
  createdAt: string
  previewImages: string[]
}
