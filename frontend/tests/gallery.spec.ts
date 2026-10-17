import { test, expect } from '@playwright/test'
import { login, adminMutation } from './helpers/admin'
test('stacked gallery supports caption search, empty states, themes and mobile', async ({
  page,
}, testInfo) => {
  await login(page)
  const ids: number[] = []
  const suffix = String(Date.now())
  const entries = [
    { title: '山野来信', description: '走进山野，收藏沿途的微光。', cover: '/images/home3.jpg' },
    {
      title: '日常切片',
      description: '在平常的日子里，也有值得停下来的风景。',
      cover: '/images/personal.jpg',
    },
    {
      title: '故事之外',
      description: '一些喜欢的画面，和它们带来的好心情。',
      cover: '/images/AccountLight.jpg',
    },
  ]
  try {
    for (const [index, entry] of entries.entries()) {
      const response = await adminMutation(page, '/admin/albums', 'POST', {
        ...entry,
        title: entry.title,
        sortOrder: -9000 + index,
        visible: true,
        version: 0,
        photos: [
          { url: entry.cover, caption: `独有照片词${suffix}` },
          { url: '/images/home2.jpg', caption: '路上的风景' },
        ],
      })
      expect(response.status()).toBe(200)
      ids.push((await response.json()).data.id)
    }
    await page.goto(`/albums?q=${suffix}`)
    await expect(page.locator('.album-card')).toHaveCount(3)
    await expect(page.getByLabel('搜索文章', { exact: true })).toHaveValue('')
    await expect(page.locator('.profile-card')).toHaveCount(1)
    await expect(page.getByRole('region', { name: '小站横幅' })).toHaveCount(1)
    await page
      .locator('.album-cover > img')
      .evaluateAll((images) =>
        Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
      )
    await page.screenshot({ path: testInfo.outputPath('gallery-light.png'), fullPage: true })
    await page.getByRole('button', { name: '切换深色模式', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.screenshot({ path: testInfo.outputPath('gallery-dark.png'), fullPage: true })
    const search = page.getByRole('searchbox', { name: '搜索相册或照片说明', exact: true })
    await search.fill(`独有照片词${suffix}`)
    await expect(page).toHaveURL(/q=/)
    await expect(page.locator('.album-card')).toHaveCount(3)
    await expect(page.getByRole('status')).toContainText('找到 3 本相册')
    await search.fill(`找不到${suffix}`)
    await expect(
      page.getByRole('heading', { name: '没有找到匹配的相册', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: '清空相册搜索', exact: true }).click()
    await search.fill(suffix)
    await expect(page.locator('.album-card')).toHaveCount(3)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('gallery-mobile.png'), fullPage: true })
    await page.locator('.album-card').first().click()
    await expect(page.locator('.album-photo-grid figure')).toHaveCount(2)
    await page.locator('.album-photo-button').first().click()
    await expect(page.getByRole('dialog', { name: '照片预览' })).toBeVisible()
    await page.getByRole('button', { name: '下一张照片' }).click()
    await expect(page.getByRole('dialog')).toContainText('2 / 2')
    await page.keyboard.press('Escape')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const animation = await page
      .locator('.album-photo-button img')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(animation).toBe('0s')
  } finally {
    for (const id of ids) {
      const current = (await (await page.request.get(`/api/v1/admin/albums/${id}`)).json()).data
      expect(
        (
          await adminMutation(page, `/admin/albums/${id}?version=${current.version}`, 'DELETE')
        ).status(),
      ).toBe(200)
    }
  }
})
