import { test, expect } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, copyFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { login, createPost, deletePost, adminMutation } from './helpers/admin'

test('static share metadata is escaped and excludes draft articles', async ({ page }, testInfo) => {
  await login(page)
  const post = await createPost(page, {
    title: '分享标题 <script>danger()</script>',
    excerpt: '摘要中的 "引号" 与 <标签>',
  })
  const draft = await createPost(page, { status: 'DRAFT' })
  const output = await mkdtemp(join(tmpdir(), 'myblog-prerender-'))
  try {
    await copyFile('index.html', join(output, 'index.html'))
    await promisify(execFile)(process.execPath, ['build/prerender.mjs'], {
      env: {
        ...process.env,
        PRERENDER_API_URL: `${testInfo.project.use.baseURL}/api/v1`,
        PUBLIC_SITE_URL: 'https://share.example.com',
        PRERENDER_OUTPUT_DIR: output,
      },
    })
    const html = await readFile(join(output, 'posts', post.slug, 'index.html'), 'utf8')
    expect(html).toContain(`href="https://share.example.com/posts/${post.slug}"`)
    expect(html).toContain('&lt;script&gt;danger()&lt;/script&gt;')
    expect(html).not.toContain('<script>danger()')
    expect(html).toContain('&quot;引号&quot; 与 &lt;标签&gt;')
    expect(html).toContain('property="og:type" content="article"')
    await expect(readFile(join(output, 'posts', draft.slug, 'index.html'))).rejects.toThrow()
  } finally {
    await deletePost(page, post.id)
    await deletePost(page, draft.id)
  }
})

test('music can be reordered, removed from the public list and restored', async ({
  page,
}, testInfo) => {
  await login(page)
  await page.goto('/admin/music')
  const title = `播放列表验证-${Date.now()}`
  const wav = Buffer.alloc(16044)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(8000, 24)
  wav.writeUInt32LE(16000, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(16000, 40)
  await page
    .getByLabel('上传音乐', { exact: true })
    .setInputFiles({ name: `${title}.wav`, mimeType: 'audio/wav', buffer: wav })
  const row = page
    .locator('.admin-track-list li')
    .filter({ has: page.getByText(title, { exact: true }) })
  await expect(row).toBeVisible()
  let current = (await (await page.request.get('/api/v1/admin/music/local')).json()).data
  const id = current.tracks.find((track: { title: string }) => track.title === title).id
  try {
    if (current.tracks.length > 1) {
      const before = current.tracks.findIndex((track: { id: number }) => track.id === id)
      const direction = before > 0 ? '上移' : '下移'
      await row.getByRole('button', { name: `${direction} ${title}`, exact: true }).click()
      await expect
        .poll(async () => {
          const data = (await (await page.request.get('/api/v1/admin/music/local')).json()).data
          return data.tracks.findIndex((track: { id: number }) => track.id === id)
        })
        .toBe(before + (before > 0 ? -1 : 1))
    }
    page.once('dialog', (dialog) => dialog.accept())
    await row.getByRole('button', { name: `移除 ${title}`, exact: true }).click()
    await expect(row.getByText('已移出播放列表')).toBeVisible()
    let publicTracks = (await (await page.request.get('/api/v1/music/local')).json()).data.tracks
    expect(publicTracks.some((track: { id: number }) => track.id === id)).toBe(false)
    await page.reload()
    await row.getByRole('button', { name: `恢复 ${title}`, exact: true }).click()
    await expect(row.getByText('已移出播放列表')).toHaveCount(0)
    publicTracks = (await (await page.request.get('/api/v1/music/local')).json()).data.tracks
    expect(publicTracks.some((track: { id: number }) => track.id === id)).toBe(true)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath('music-maintenance-mobile.png'),
      fullPage: true,
    })
  } finally {
    current = (await (await page.request.get('/api/v1/admin/music/local')).json()).data
    const track = current.tracks.find((item: { id: number }) => item.id === id)
    if (track && !track.hidden)
      await adminMutation(page, `/admin/music/local/${id}/visibility`, 'PUT', {
        version: track.version,
        hidden: true,
      })
  }
})
