import { test, expect } from '@playwright/test'

test('fullscreen weather survives scrolling, hidden banners and article navigation', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.locator('summary[aria-label="外观设置"]').click()
  await expect(page.getByText('全屏天气氛围', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '雨天', exact: true }).click()
  const weather = page.locator('.weather-atmosphere')
  await expect(weather).toBeVisible()
  await page.getByRole('checkbox', { name: /显示图片横幅/ }).uncheck()
  await expect(page.locator('.hero')).toBeHidden()
  await expect(weather).toBeVisible()
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  async function expectFullscreen() {
    const viewport = page.viewportSize()!
    const bounds = (await weather.boundingBox())!
    expect(bounds.x).toBe(0)
    expect(bounds.y).toBe(0)
    expect(bounds.height).toBe(viewport.height)
    // Desktop browsers reserve a gutter for the page scrollbar.
    expect(bounds.width).toBeGreaterThanOrEqual(viewport.width - 20)
    expect(bounds.width).toBeLessThanOrEqual(viewport.width)
  }
  await expectFullscreen()
  await page.goto('/posts/hello-world')
  await expect(page.locator('.article-page')).toBeVisible()
  await expect(weather).toHaveClass(/weather-rain/)
  await page.locator('summary[aria-label="外观设置"]').click()
  for (const [name, mode] of [
    ['飘雪', 'snow'],
    ['微光', 'glow'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(weather).toHaveClass(new RegExp(`weather-${mode}`))
    await expect(weather).toBeVisible()
  }
  await page.getByRole('checkbox', { name: /动态效果/ }).uncheck()
  await expect(weather).toBeHidden()
  await page.getByRole('checkbox', { name: /动态效果/ }).check()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(weather).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(weather).toBeVisible()
  await page.getByRole('button', { name: '飘雪', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await expectFullscreen()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('weather-mobile.png'), fullPage: false })
  await page.locator('summary[aria-label="外观设置"]').click()
  await page.getByRole('button', { name: '晴天', exact: true }).click()
  await expect(weather).toHaveCount(0)
})

test('appearance preferences persist and system theme reacts to changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.post-card')).toHaveCount(4)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('summary[aria-label="外观设置"]').click()
  await page.getByRole('button', { name: '晴蓝主题' }).click()
  await page.getByRole('button', { name: '舒展', exact: true }).click()
  await page.getByRole('checkbox', { name: /显示图片横幅/ }).uncheck()
  await expect(page.locator('.hero')).toBeHidden()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-color', 'blue')
  await expect(page.locator('html')).toHaveAttribute('data-reading-size', 'large')
  await expect(page.locator('.hero')).toBeHidden()
  await page.locator('summary[aria-label="外观设置"]').click()
  await page.getByRole('button', { name: '浅色', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.keyboard.press('Escape')
  await expect(page.locator('.appearance-settings')).not.toHaveAttribute('open', '')
})

test('list view persists and keyboard search opens article suggestions', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '列表视图' }).click()
  await page.reload()
  await expect(page.locator('.post-grid.list-view')).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(page.getByLabel('搜索文章')).toBeFocused()
  await page.getByLabel('搜索文章').fill('MySQL')
  const result = page.locator('.search-result').filter({ hasText: 'MySQL' })
  await expect(result).toHaveCount(1)
  await result.click()
  await expect(page.locator('.article-page h1')).toContainText('MySQL')
  await expect(page.locator('.search-suggestions')).toHaveCount(0)
})

test('calendar selects actual publication dates and links to the article', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00+08:00'))
  await page.goto('/')
  const calendar = page.getByRole('region', { name: '文章日历' })
  await calendar.getByRole('button', { name: '2026-10-14，1 篇文章' }).click()
  await expect(calendar.locator('.calendar-posts')).toContainText('你好，世界')
  await page.getByRole('button', { name: '日历上个月' }).click()
  await expect(calendar.locator('.calendar-month')).toHaveText('2026 年 9 月')
  await calendar.getByRole('button', { name: '2026-09-26，1 篇文章' }).click()
  await calendar.locator('.calendar-posts a').click()
  await expect(page.locator('.article-page')).toBeVisible()
})

test('article image preview restores focus and code copy preserves plain text', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.route('**/api/v1/posts/hello-world', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.data.content =
      '## 图片与代码\n\n![山间风景](/images/landscape.svg)\n\n```java\nclass Demo { int value = 42; }\n```'
    await route.fulfill({ json: body })
  })
  await page.goto('/posts/hello-world')
  const image = page.getByRole('button', { name: '放大图片：山间风景' })
  await image.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: '图片预览' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '图片预览' })).toBeHidden()
  await expect(image).toBeFocused()
  await page.getByRole('button', { name: '复制代码块 1' }).click()
  await expect(page.locator('.code-copy')).toContainText('已复制')
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(
    'class Demo { int value = 42; }\n',
  )
  await page.getByRole('link', { name: '返回文章列表' }).click()
  await expect(page.locator('.post-card')).toHaveCount(4)
  expect(errors).toEqual([])
})

test('mobile panels stay inside viewport and back-to-top works with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.post-card')).toHaveCount(4)
  await page.locator('summary[aria-label="外观设置"]').click()
  const bounds = await page.locator('.appearance-panel').boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape')
  await page.keyboard.press('/')
  await expect(page.locator('.search-result').first()).toBeVisible()
  const searchBounds = await page.locator('.search-suggestions').boundingBox()
  expect(searchBounds!.x).toBeGreaterThanOrEqual(0)
  expect(searchBounds!.x + searchBounds!.width).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.getByRole('button', { name: '回到顶部' }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  for (const width of [320, 390, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
})

test('blocked local storage still allows appearance changes for the current visit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage disabled', 'SecurityError')
    }
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: '切换深色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('summary[aria-label="外观设置"]').click()
  await page.getByRole('button', { name: '松绿主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-color', 'green')
})
