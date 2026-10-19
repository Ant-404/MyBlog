declare module 'virtual:home-images' {
  const images: string[]
  export default images
}
declare module 'virtual:responsive-images' {
  const images: Record<string, { avif: string; webp: string }>
  export default images
}
declare module 'virtual:local-music' {
  const tracks: import('./types/music').MusicTrack[]
  export default tracks
}
declare module 'virtual:user-images' {
  const images: string[]
  export default images
}
