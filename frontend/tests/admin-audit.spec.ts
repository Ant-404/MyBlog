import { test, expect } from '@playwright/test'
import { login, adminMutation } from './helpers/admin'
const sections = [
  ['/admin/posts', '文章管理'],
  ['/admin/albums', '相册管理'],
  ['/admin/projects', '项目展示管理'],
  ['/admin/taxonomy', '内容组织'],
  ['/admin/series', '文章专题管理'],
  ['/admin/media', '图片管理'],
  ['/admin/comments', '评论管理'],
  ['/admin/guestbook', '留言墙管理'],
  ['/admin/friends', '友链管理'],
  ['/admin/anime', '追番管理'],
  ['/admin/music', '本地音乐'],
  ['/admin/statistics', '阅读统计'],
  ['/admin/settings', '站点设置'],
]
test('all admin sections load and the grouped dashboard uses real counts', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/admin/') && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`)
  })
  await login(page)
  const data = (await (await page.request.get('/api/v1/admin/dashboard')).json()).data
  await expect(page.locator('.dashboard-stats section')).toHaveCount(6)
  await expect(page.locator('.dashboard-stats section').nth(1).locator('strong')).toHaveText(
    String(data.drafts),
  )
  await expect(page.locator('.dashboard-stats section').nth(2).locator('strong')).toHaveText(
    String(data.albums),
  )
  await expect(page.locator('.admin-nav-group')).toHaveCount(3)
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true })
  for (const [path, heading] of sections) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: false }).first()).toBeVisible()
    await expect(page.locator('.admin-main .loader')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  await expect(
    page.getByRole('navigation', { name: '后台导航' }).getByRole('link', { name: '相册管理' }),
  ).toHaveCount(1)
  await page.goto('/admin/statistics')
  await expect(page.getByText('文章评论总数', { exact: true })).toBeVisible()
  await expect(page.getByText('待管理评论', { exact: true })).toHaveCount(0)
  await page.goto('/admin/comments?page=99999')
  await expect(page).not.toHaveURL(/page=99999/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin')
  await expect(page.locator('.dashboard-stats section')).toHaveCount(6)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('photo library searches across files and handles no results', async ({ page }) => {
  await login(page)
  await page.goto('/admin/media')
  await page.getByLabel('搜索图片名称', { exact: true }).fill(`不存在的图片-${Date.now()}`)
  await page.getByRole('button', { name: '搜索图片', exact: true }).click()
  await expect(page.getByText('没有找到匹配的图片。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '显示全部图片', exact: true }).click()
  await expect(page.getByLabel('搜索图片名称', { exact: true })).toHaveValue('')
  const invalid = await page.request.get('/api/v1/admin/media/page?page=0')
  expect(invalid.status()).toBe(400)
})
