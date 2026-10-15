import { test, expect } from '@playwright/test'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { localMusic } from '../build/localMusic'
import type { MusicTrack } from '../src/types/music'

test('local music discovers encoded names, stable IDs, covers and file additions/removals', async () => {
  const root = mkdtempSync(join(tmpdir(), 'myblog-music-test-'))
  const directory = join(root, 'public', 'music')
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, '歌手 - 晴天 #1.MP3'), '')
  writeFileSync(join(directory, '歌手 - 晴天 #1.JPG'), '')
  writeFileSync(join(directory, '独奏.ogg'), '')
  writeFileSync(join(directory, 'cover.png'), '')
  writeFileSync(join(directory, 'README.md'), '')
  mkdirSync(join(directory, 'nested.mp3'))
  const server = await createServer({
    configFile: false,
    root,
    plugins: [localMusic()],
    server: { middlewareMode: true, hmr: false },
  })
  const tracks = async (): Promise<MusicTrack[]> => {
    const result = await server.transformRequest('virtual:local-music')
    return JSON.parse(result!.code.replace(/^export default /, '').replace(/;\s*$/, ''))
  }
  try {
    const initial = await tracks()
    expect(initial).toHaveLength(2)
    const named = initial.find((track) => track.title === '晴天 #1')!
    expect(named.artist).toBe('歌手')
    expect(named.audioUrl).toBe('/music/' + encodeURIComponent('歌手 - 晴天 #1.MP3'))
    expect(named.cover).toBe('/music/' + encodeURIComponent('歌手 - 晴天 #1.JPG'))
    expect(initial.find((track) => track.title === '独奏')!.cover).toBe('/music/cover.png')
    await expect
      .poll(() => Object.values(server.watcher.getWatched()).flat())
      .toContain('README.md')
    writeFileSync(join(directory, '新增.wav'), '')
    await expect.poll(async () => (await tracks()).length).toBe(3)
    expect((await tracks()).find((track) => track.title === '晴天 #1')!.id).toBe(named.id)
    rmSync(join(directory, '新增.wav'))
    await expect.poll(async () => (await tracks()).length).toBe(2)
  } finally {
    await server.close()
    rmSync(root, { recursive: true, force: true })
  }
})
