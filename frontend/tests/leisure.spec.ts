import { test, expect } from '@playwright/test'
import { login, adminMutation } from './helpers/admin'
import { localMusic, testTracks } from './helpers/music'

test('local music plays continuously between public routes and appears in admin', async ({
  page,
}) => {
  await localMusic(
    page,
    testTracks.map((track, index) => ({
      ...track,
      cover: index === 0 ? '/images/landscape.svg' : '',
    })),
  )
  const remoteRequests: string[] = []
  page.on('request', (request) => {
    if (/qq\.com|meting/.test(request.url())) remoteRequests.push(request.url())
  })
  await login(page)
  await page.goto('/admin/music')
  await expect(page.locator('.admin-track-list li')).toHaveCount(3)
  await expect(page.getByRole('link', { name: '试听 歌曲 1', exact: true })).toHaveAttribute(
    'href',
    '/music/test-1.wav',
  )
  await expect(page.getByLabel('QQ 音乐歌单链接或 ID')).toHaveCount(0)
  await page.goto('/')
  await page.getByRole('button', { name: '展开音乐播放器' }).click()
  const audio = page.locator('.music-widget audio')
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(true)
  await page.getByRole('button', { name: '播放音乐', exact: true }).click()
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime))
    .toBeGreaterThan(0)
  const audioHandle = await audio.elementHandle()
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '文章', exact: true })
    .click()
  await page
    .getByRole('navigation', { name: '文章浏览方式' })
    .getByRole('link', { name: '归档', exact: true })
    .click()
  await expect(page.locator('.archive-row')).toHaveCount(6)
  expect(await audioHandle!.evaluate((node) => node.isConnected)).toBe(true)
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(false)
  await page.getByRole('button', { name: '下一首', exact: true }).click()
  await expect(page.locator('.music-now-playing strong')).toHaveText('歌曲 2')
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(false)
  await page.getByRole('button', { name: '暂停音乐', exact: true }).click()
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(true)
  await page.getByRole('slider', { name: '音乐音量' }).press('Home')
  expect(await audio.evaluate((node: HTMLAudioElement) => node.volume)).toBe(0)
  await page.getByRole('button', { name: '显示或隐藏播放列表' }).click()
  await expect(page.locator('.music-track-list li')).toHaveCount(3)
  await expect(
    page.locator('.music-track-list li').first().locator('.music-track-cover img'),
  ).toHaveAttribute('src', '/images/landscape.svg')
  await expect(
    page.locator('.music-track-list li').nth(1).locator('.music-track-cover svg'),
  ).toBeVisible()
  await page.screenshot({ path: '../docs/screenshots/music-player-local.png' })
  expect(remoteRequests).toEqual([])
})

test('unavailable local audio gives a useful error and the player fits mobile screens', async ({
  page,
}) => {
  await localMusic(page, [
    { id: 1, title: '不可用音源', artist: '测试', audioUrl: '/music/missing.wav', cover: '' },
  ])
  await page.route('**/music/missing.wav', (route) => route.fulfill({ status: 404, body: '' }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '展开音乐播放器' }).click()
  await page.getByRole('button', { name: '播放音乐', exact: true }).click()
  await expect(page.locator('.music-error')).toBeVisible()
  await expect(page.getByRole('link', { name: 'QQ 音乐', exact: true })).toHaveCount(0)
  for (const width of [320, 390, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('an empty local music directory shows a clear empty state', async ({ page }) => {
  await localMusic(page, [])
  await page.goto('/')
  await page.getByRole('button', { name: '展开音乐播放器' }).click()
  await expect(page.locator('.music-empty')).toContainText('暂时还没有本地音乐')
  await expect(page.getByRole('button', { name: '播放音乐', exact: true })).toHaveCount(0)
})

test('continuous hue persists and the night background has no dot texture', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await page.locator('summary[aria-label="外观设置"]').click()
  const hue = page.getByRole('slider', { name: '主题色相' })
  await hue.focus()
  await hue.press('End')
  await hue.press('ArrowLeft')
  await expect(hue).toHaveValue('359')
  expect(
    await page
      .locator('html')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--hue').trim()),
  ).toBe('359')
  await page.reload()
  expect(
    await page
      .locator('html')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--hue').trim()),
  ).toBe('359')
  expect(
    await page.locator('.blog-layout').evaluate((node) => getComputedStyle(node).backgroundImage),
  ).toBe('none')
})

test('anime records can be managed and displayed in a separate public page', async ({ page }) => {
  await login(page)
  page.on('dialog', (dialog) => dialog.accept())
  const title = `追番测试 ${Date.now()}`
  let id: number | undefined
  try {
    await page.goto('/admin/anime')
    await page.getByLabel('番剧名称').fill(title)
    await page.getByLabel('已看集数').fill('3')
    await page.getByLabel('总集数（未知填 0）').fill('12')
    await page.getByLabel('个人评分（0 表示未评）').fill('8.5')
    await page.getByLabel('观后感').fill('这是一条临时观看记录。')
    await page.getByRole('button', { name: '新增追番记录', exact: true }).click()
    await expect(page.locator('.management-list')).toContainText(title)
    const entries = (await (await page.request.get('/api/v1/admin/anime')).json()).data
    id = entries.find((entry: { title: string }) => entry.title === title).id
    await page.goto('/anime')
    const card = page.locator('.anime-card').filter({ hasText: title })
    await expect(card).toContainText('已看 3 / 12 集')
    await expect(card).toContainText('8.5')
    await page.getByRole('button', { name: '想看', exact: false }).click()
    await expect(page.locator('.anime-card')).toHaveCount(0)
    await page.locator('[aria-label="追番状态筛选"]').getByRole('button', { name: /全部/ }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(card).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: '../docs/screenshots/anime-mobile.png', fullPage: true })
    await page.goto('/admin/anime')
    await page.getByRole('button', { name: `编辑${title}`, exact: true }).click()
    await page.getByLabel('观看状态').selectOption('COMPLETED')
    await expect(page.getByLabel('已看集数')).toHaveValue('12')
    await page.getByRole('button', { name: '保存追番记录' }).click()
    await expect(page.locator('.management-list')).toContainText('看完 · 12/12 集')
  } finally {
    if (id) {
      const entries = (await (await page.request.get('/api/v1/admin/anime')).json()).data
      const entry = entries.find((item: { id: number }) => item.id === id)
      if (entry) await adminMutation(page, `/admin/anime/${id}?version=${entry.version}`, 'DELETE')
    }
  }
})
