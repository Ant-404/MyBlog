declare module 'virtual:home-images' {
  const images: string[]
  export default images
}
declare module 'virtual:local-music' {
  const tracks: import('./types/music').MusicTrack[]
  export default tracks
}
