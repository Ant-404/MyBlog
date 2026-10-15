import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { loginMember } from './helpers/member'

test('wave crests rise and fall continuously and freeze when paused', async ({ page }) => {
  await page.goto('/')
  const crest = page.locator('.wave-layer-2 path')
  const transform = () => crest.evaluate((node) => getComputedStyle(node).transform)
  const scale = async () => Number((await transform()).split(',')[3])
  const initial = await scale()
  await expect.poll(async () => Math.abs((await scale()) - initial)).toBeGreaterThan(0.08)
  await page.getByRole('button', { name: '暂停横幅动画' }).click()
  await crest.evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.ready))
  })
  const paused = await transform()
  await page.waitForTimeout(500)
  expect(await transform()).toBe(paused)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await crest.evaluate((node) => getComputedStyle(node).animationName)).toBe('none')
})

async function banners(
  page: import('@playwright/test').Page,
  paths = ['/images/home1.jpg', '/images/test-home.jpg'],
) {
  await page.route('**/*virtual:home-images*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(paths)}`,
    }),
  )
  await page.route('**/images/test-home.jpg', (route) =>
    route.fulfill({ contentType: 'image/jpeg', body: readFileSync('public/images/home1.jpg') }),
  )
}

test('banner changes without repeating and pause/reduced motion stop automatic changes', async ({
  page,
}) => {
  await page.clock.install()
  await banners(page)
  await page.goto('/')
  const current = page.locator('.hero-picture-current')
  const initial = await current.getAttribute('src')
  await page.getByRole('button', { name: '随机切换横幅' }).click()
  await expect(current).not.toHaveAttribute('src', initial!)
  await page.getByRole('button', { name: '暂停横幅动画' }).click()
  const paused = await current.getAttribute('src')
  await page.clock.runFor(13000)
  await expect(current).toHaveAttribute('src', paused!)
  expect(
    await page
      .locator('.wave-layer')
      .first()
      .evaluate((node) => getComputedStyle(node).animationPlayState),
  ).toBe('paused')
  await page.getByRole('button', { name: '播放横幅动画' }).click()
  await page.clock.runFor(13000)
  await expect(current).not.toHaveAttribute('src', paused!)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await current.getAttribute('src')
  await page.clock.runFor(13000)
  await expect(current).toHaveAttribute('src', reduced!)
  expect(
    await page
      .locator('.wave-layer')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none')
})

test('unreadable banner falls back to a working image', async ({ page }) => {
  await banners(page, ['/images/test-broken.jpg'])
  await page.route('**/images/test-broken.jpg', (route) => route.fulfill({ status: 404, body: '' }))
  await page.goto('/')
  await expect(page.locator('.hero-picture-current')).toHaveAttribute(
    'src',
    '/images/landscape.svg',
  )
  expect(
    await page
      .locator('.hero-picture-current')
      .evaluate((node) => (node as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)
})

test('mobile keyboard search highlights results and restores launcher focus on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const launcher = page.getByRole('button', { name: '打开文章搜索' })
  await launcher.click()
  await page.getByLabel('搜索文章').fill('MySQL')
  await expect(page.locator('.search-result')).toHaveCount(1)
  await expect(page.locator('.search-result mark').first()).toHaveText(/MySQL/i)
  await page.getByLabel('搜索文章').press('ArrowDown')
  await expect(page.locator('.search-result.selected')).toHaveCount(1)
  await page.getByLabel('搜索文章').press('Enter')
  await expect(page.locator('.article-page h1')).toContainText('MySQL')
  await launcher.click()
  await page.keyboard.press('Escape')
  await expect(launcher).toBeFocused()
  await expect(page.getByLabel('搜索文章')).toBeHidden()
})

test('article uses sticky contents, supports focus mode and resolves deep links after load', async ({
  page,
}) => {
  await page.route('**/api/v1/posts/hello-world', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.data.content =
      '## 第一章\n\n' + '阅读内容。\n\n'.repeat(40) + '## 第二章\n\n' + '继续阅读。\n\n'.repeat(40)
    await route.fulfill({ json: body })
  })
  await page.goto('/posts/hello-world#article-heading-2')
  await expect(page.locator('.hero')).toHaveCount(0)
  await expect(page.locator('.desktop-article-toc')).toBeVisible()
  await expect
    .poll(() =>
      page
        .locator('#article-heading-2')
        .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
    )
    .toBeLessThan(160)
  await page.getByRole('button', { name: '专注阅读', exact: true }).click()
  await expect(page.locator('.article-sidebar')).toBeHidden()
  await page.reload()
  await expect(page.getByRole('button', { name: '退出专注', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '退出专注', exact: true }).click()
  await page.locator('summary[aria-label="外观设置"]').click()
  await page.getByRole('checkbox', { name: /动态效果/ }).uncheck()
  await page.getByRole('button', { name: '恢复默认外观' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
})

test('long code can expand/wrap and image gallery navigates without losing opener focus', async ({
  page,
}) => {
  await page.route('**/api/v1/posts/hello-world', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.data.content =
      '## 图文\n\n![山景](/images/landscape.svg)\n\n![秋景](/images/autumn.svg)\n\n```java\n' +
      'class Example {}\n'.repeat(30) +
      '```'
    await route.fulfill({ json: body })
  })
  await page.goto('/posts/hello-world')
  const code = page.locator('.code-frame')
  await expect(code).toHaveClass(/is-collapsed/)
  await page.getByRole('button', { name: '展开代码', exact: true }).click()
  await expect(code).not.toHaveClass(/is-collapsed/)
  await page.getByRole('button', { name: '代码块 1 自动换行' }).click()
  await expect(code).toHaveClass(/is-wrapped/)
  const image = page.getByRole('button', { name: '放大图片：山景' })
  await image.click()
  const dialog = page.getByRole('dialog', { name: '图片预览' })
  await page.getByRole('button', { name: '下一张图片' }).click()
  await expect(dialog.locator('img')).toHaveAttribute('alt', '秋景')
  await page.getByRole('button', { name: '查看原始尺寸' }).click()
  await expect(dialog).toHaveClass(/is-zoomed/)
  await page.keyboard.press('Escape')
  await expect(image).toBeFocused()
})

test('comment draft survives reload and remains isolated to its article', async ({ page }) => {
  await loginMember(page)
  await page.goto('/posts/hello-world')
  await page.getByLabel('评论内容').fill('还没写完的评论')
  await expect(page.locator('.comment-counter')).toContainText('草稿已保存')
  await page.reload()
  await expect(page.getByLabel('评论内容')).toHaveValue('还没写完的评论')
  await page.goto('/')
  await page.locator('.post-body h2 a').filter({ hasText: 'Spring Boot' }).click()
  await expect(page.getByLabel('评论内容')).toHaveValue('')
})

test('anime filters persist in the URL and work with browser navigation', async ({ page }) => {
  await page.goto('/anime')
  await page.getByRole('button', { name: /^在看/ }).click()
  await page.getByLabel('搜索番剧').fill('测试作品')
  await page.getByLabel('追番排序').selectOption('score')
  await expect(page).toHaveURL(/status=WATCHING.*order=score/)
  await page.reload()
  await expect(page.getByLabel('搜索番剧')).toHaveValue('测试作品')
  await expect(page.getByLabel('追番排序')).toHaveValue('score')
  await expect(page.getByRole('button', { name: /^在看/ })).toHaveAttribute('aria-pressed', 'true')
})

test('music remembers playback mode and last track without autoplaying after reload', async ({
  page,
}) => {
  await page.route('**/api/v1/music', (route) =>
    route.fulfill({
      json: {
        code: 200,
        message: 'ok',
        data: {
          enabled: true,
          name: '测试歌单',
          profileUrl: '',
          playlistId: '',
          version: 1,
          tracks: [1, 2, 3].map((id) => ({
            id,
            title: `歌曲 ${id}`,
            artist: '测试歌手',
            audioUrl: '',
            cover: '',
            sourceUrl: 'https://y.qq.com/',
          })),
        },
      },
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: '展开音乐播放器' }).click()
  await page.getByRole('button', { name: '播放模式：列表循环' }).click()
  await expect(page.getByRole('button', { name: '播放模式：单曲循环' })).toBeVisible()
  await page.getByRole('button', { name: '下一首', exact: true }).click()
  await expect(page.locator('.music-now-playing')).toContainText('歌曲 2')
  await page.reload()
  await page.getByRole('button', { name: '展开音乐播放器' }).click()
  await expect(page.locator('.music-now-playing')).toContainText('歌曲 2')
  await expect(page.getByRole('button', { name: '播放模式：单曲循环' })).toBeVisible()
  await expect(page.getByRole('button', { name: '播放音乐', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '播放模式：单曲循环' }).click()
  await page.getByRole('button', { name: '下一首', exact: true }).click()
  await expect(page.locator('.music-now-playing')).not.toContainText('歌曲 2')
})
