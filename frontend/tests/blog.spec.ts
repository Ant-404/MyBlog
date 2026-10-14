import { test, expect } from '@playwright/test'

test('real API renders homepage, pagination, category and search', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.post-card')).toHaveCount(4)
  await expect(page.locator('.result-count')).toHaveText('6 篇记录')
  await page.screenshot({ path: '../docs/screenshots/home-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page.locator('.post-card')).toHaveCount(2)
  await page.locator('.category-tabs').getByRole('button', { name: /技术/ }).click()
  await expect(page.locator('.post-card')).toHaveCount(3)
  await page.getByLabel('搜索文章').fill('B-tree')
  await page.getByLabel('搜索文章').press('Enter')
  await expect(page.locator('.post-card')).toHaveCount(1)
  await expect(page.locator('.post-card h2')).toContainText('MySQL')
  expect(errors).toEqual([])
})

test('article, archives, taxonomy, friends, about and 404 routes', async ({ page }) => {
  await page.goto('/posts/hello-world')
  await expect(page.locator('.prose')).toContainText('我是憨Ant')
  await page.screenshot({ path: '../docs/screenshots/post-detail.png', fullPage: true })
  await page.goto('/archives')
  await expect(page.locator('.archive-row')).toHaveCount(6)
  await page.screenshot({ path: '../docs/screenshots/archives.png', fullPage: true })
  await page.goto('/categories')
  await expect(page.locator('.taxonomy-card')).toHaveCount(3)
  await page.goto('/tags')
  await expect(page.locator('.tag-cloud.large a')).toHaveCount(9)
  await page.goto('/friends')
  await expect(page.locator('.friend-card')).toHaveCount(3)
  await page.goto('/about')
  await expect(page.getByRole('heading', { name: /你好，我是 憨Ant/ })).toBeVisible()
  await page.goto('/missing-page')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('theme choice survives refresh', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: '切换深色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.post-card')).toHaveCount(4)
  await page.screenshot({ path: '../docs/screenshots/home-dark.png', fullPage: true })
})

test('mobile navigation and layout stay within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.post-card')).toHaveCount(4)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.screenshot({ path: '../docs/screenshots/home-mobile.png', fullPage: true })
  await page.getByRole('button', { name: '打开或关闭导航' }).click()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '归档' }).click()
  await expect(page.locator('.archive-row')).toHaveCount(6)
})

test('Markdown strips scripts, event attributes and unsafe links', async ({ page }) => {
  await page.route('**/api/v1/posts/hello-world', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.data.content =
      '# Safe heading\n<script>window.xssExecuted=true</script>\n<img src="x" onerror="window.xssExecuted=true">\n<a href="javascript:alert(1)">unsafe link</a>'
    await route.fulfill({ json: body })
  })
  await page.goto('/posts/hello-world')
  await expect(page.locator('.prose h1')).toHaveText('Safe heading')
  await expect(page.locator('.prose script')).toHaveCount(0)
  await expect(page.locator('.prose [onerror]')).toHaveCount(0)
  await expect(page.locator('.prose a')).not.toHaveAttribute('href', /javascript:/)
  expect(await page.evaluate(() => 'xssExecuted' in window)).toBeFalsy()
})

test('failed API shows retry and empty search shows empty state', async ({ page }) => {
  await page.route('**/api/v1/posts?*', (route) =>
    route.fulfill({
      status: 503,
      json: { code: 'DATABASE_UNAVAILABLE', message: '数据服务暂时不可用', data: null },
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('数据服务暂时不可用')
  await page.unroute('**/api/v1/posts?*')
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.locator('.post-card')).toHaveCount(4)
  await page.getByLabel('搜索文章').fill('no-result-unique-12345')
  await page.getByLabel('搜索文章').press('Enter')
  await expect(page.getByText('这里暂时没有内容。')).toBeVisible()
})
