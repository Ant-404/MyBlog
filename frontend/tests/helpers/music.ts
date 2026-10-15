import type { Page } from '@playwright/test'
import type { MusicTrack } from '../../src/types/music'

export const testTracks: MusicTrack[] = [1, 2, 3].map((id) => ({
  id,
  title: `歌曲 ${id}`,
  artist: '测试歌手',
  audioUrl: `/music/test-${id}.wav`,
  cover: '',
}))

// Test-only silent PCM, never written into the user's music directory.
const sampleRate = 8000
const dataSize = sampleRate * 2 * 20
const wav = Buffer.alloc(44 + dataSize)
wav.write('RIFF', 0)
wav.writeUInt32LE(36 + dataSize, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24)
wav.writeUInt32LE(sampleRate * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(dataSize, 40)

export async function localMusic(page: Page, tracks = testTracks) {
  await page.route(/\/api\/v1\/(admin\/)?music\/local$/, (route) =>
    route.fulfill({ json: { code: 'OK', data: { name: '耳边的小世界', enabled: true, tracks } } }),
  )
  await page.route('**/*virtual:local-music*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(tracks)}`,
    }),
  )
  await page.route(/\/music\/test-[123]\.wav(?:\?|$)/, (route) => {
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '')
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1
    if (start > end || start >= wav.length) return route.fulfill({ status: 416 })
    return route.fulfill({
      status: range ? 206 : 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
      },
      body: wav.subarray(start, end + 1),
    })
  })
}
