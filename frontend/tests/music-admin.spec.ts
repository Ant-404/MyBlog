import { test, expect } from '@playwright/test'
import { login } from './helpers/admin'

test('admin uploads audio, edits metadata and replaces its cover persistently', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/music')
  const title = `上传验证-${Date.now()}`
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
    .setInputFiles({ name: `测试歌手 - ${title}.wav`, mimeType: 'audio/wav', buffer: wav })
  let row = page
    .locator('.admin-track-list li')
    .filter({ has: page.getByText(title, { exact: true }) })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: `编辑 ${title}`, exact: true }).click()
  await row.getByLabel('歌名', { exact: true }).fill(`${title}已编辑`)
  await row.getByLabel('歌手', { exact: true }).fill('新的歌手')
  await row.getByRole('button', { name: '保存资料' }).click()
  row = page
    .locator('.admin-track-list li')
    .filter({ has: page.getByText(`${title}已编辑`, { exact: true }) })
  await expect(row.getByText('新的歌手', { exact: true })).toBeVisible()
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  await row
    .getByLabel(`更换 ${title}已编辑 封面`)
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
  await expect(row.locator('img')).toBeVisible()
  await expect
    .poll(() => row.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  await page.reload()
  await expect(row.getByText('新的歌手', { exact: true })).toBeVisible()
  await expect(row.locator('img')).toBeVisible()
  await page.screenshot({ path: '../docs/screenshots/admin-music-library.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(row).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/')
  await page.getByRole('button', { name: '展开音乐播放器' }).click()
  await page.getByRole('button', { name: '显示或隐藏播放列表' }).click()
  await expect(
    page.locator('.music-track-list').getByText(`${title}已编辑`, { exact: true }),
  ).toBeVisible()
})
