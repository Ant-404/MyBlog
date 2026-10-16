import { expect, test } from '@playwright/test'

test('anime poster cards keep summaries, progress and filters usable across layouts', async ({
  page,
}) => {
  const note = '这是用于布局检查的长篇观后感，记录角色成长与故事节奏。'.repeat(8)
  const entries = [
    {
      id: 9001,
      title: '春日里的故事',
      cover: '/images/home1.jpg',
      status: 'COMPLETED',
      watchedEpisodes: 12,
      totalEpisodes: 12,
      score: 9.1,
      note,
      sourceUrl: 'https://example.com/anime',
    },
    {
      id: 9002,
      title: '一起奔向远方',
      cover: '/images/home2.jpg',
      status: 'WATCHING',
      watchedEpisodes: 3,
      totalEpisodes: 23,
      score: 8.5,
      note: '喜欢它细腻的叙事，也期待接下来的故事。',
      sourceUrl: '',
    },
    {
      id: 9003,
      title: '等待开始的新故事',
      cover: '/missing-poster.jpg',
      status: 'PLANNED',
      watchedEpisodes: 0,
      totalEpisodes: 0,
      score: 0,
      note: '',
      sourceUrl: '',
    },
  ]
  await page.route('**/api/v1/anime', (route) => route.fulfill({ json: { data: entries } }))
  await page.route('**/missing-poster.jpg', (route) => route.fulfill({ status: 404, body: '' }))
  await page.goto('/anime')
  const cards = page.locator('.anime-card')
  await expect(cards).toHaveCount(3)
  const first = cards.first()
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    const cover = (await first.locator('.anime-cover').boundingBox())!
    const body = (await first.locator('.anime-body').boundingBox())!
    expect(cover.x + cover.width).toBeLessThanOrEqual(body.x + 1)
    expect(cover.height).toBeGreaterThan(cover.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await expect(cards.nth(2).locator('.anime-cover-placeholder')).toBeVisible()
  await expect(cards.nth(2)).toContainText('未定')
  await expect(first.getByRole('progressbar')).toHaveAttribute('value', '12')
  await first.getByRole('button', { name: '展开观后感' }).click()
  await expect(first.locator('.anime-note')).toHaveClass(/is-expanded/)
  await first.getByRole('button', { name: '收起观后感' }).click()
  await expect(first.getByRole('link', { name: '作品页面' })).toHaveAttribute(
    'href',
    'https://example.com/anime',
  )
  for (const [width, theme] of [
    [1440, 'light'],
    [390, 'dark'],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme)
    await page.locator('.anime-page').screenshot({
      path: `test-results/anime-layout-${width}-${theme}.png`,
      animations: 'disabled',
    })
  }
  await page.getByRole('button', { name: /^在看/ }).click()
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('一起奔向远方')
  await page.getByRole('button', { name: /^全部/ }).click()
  await page.getByLabel('搜索番剧').fill('春日')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('春日里的故事')
})
