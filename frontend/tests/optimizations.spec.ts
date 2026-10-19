import { test, expect } from '@playwright/test'
import { login, createPost, deletePost, adminMutation } from './helpers/admin'

test('new unsaved article can recover from a local draft after reload', async ({ page }) => {
  await login(page)
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/admin/posts/new')
  await page.getByLabel('文章标题', { exact: true }).fill('尚未保存的新文章')
  await page.getByLabel('正文（Markdown）').fill('刷新后应恢复的文字')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('myblog-draft:test-admin:new') || 'null')?.form.content,
      ),
    )
    .toBe('刷新后应恢复的文字')
  await page.reload()
  await page.getByRole('button', { name: '恢复本机草稿' }).click()
  await expect(page.getByLabel('文章标题', { exact: true })).toHaveValue('尚未保存的新文章')
  await expect(page.getByLabel('正文（Markdown）')).toHaveValue('刷新后应恢复的文字')
  await expect(page.locator('.autosave-bar')).toContainText('自动保存已暂停')
})

test('typing during a delayed autosave is preserved and saved on the next request', async ({
  page,
}) => {
  await login(page)
  const post = await createPost(page, { status: 'DRAFT', content: '初始正文' })
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let received!: () => void
  const started = new Promise<void>((resolve) => {
    received = resolve
  })
  let first = true
  try {
    await page.goto(`/admin/posts/${post.id}/edit`)
    await page.route(`**/api/v1/admin/posts/${post.id}`, async (route) => {
      if (route.request().method() !== 'PUT' || !first) {
        await route.continue()
        return
      }
      first = false
      const response = await route.fetch()
      received()
      await held
      await route.fulfill({ response })
    })
    const content = page.getByLabel('正文（Markdown）')
    await content.fill('第一轮保存')
    await started
    await expect(content).toBeEnabled()
    await content.fill('保存中继续输入的内容')
    release()
    await expect(content).toHaveValue('保存中继续输入的内容')
    await expect
      .poll(
        async () =>
          (await (await page.request.get(`/api/v1/admin/posts/${post.id}`)).json()).data.content,
        { timeout: 15000 },
      )
      .toBe('保存中继续输入的内容')
  } finally {
    release()
    await page.unrouteAll({ behavior: 'wait' })
    await deletePost(page, post.id)
  }
})

test('article SEO resets on navigation and mobile banner uses a responsive image', async ({
  page,
}) => {
  await login(page)
  const post = await createPost(page, { excerpt: '文章专属分享摘要' })
  try {
    await page.goto(`/posts/${post.slug}`)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      '文章专属分享摘要',
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/posts/${post.slug}$`),
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
    await expect
      .poll(() =>
        page.locator('.hero-picture-current').evaluate((img: HTMLImageElement) => img.currentSrc),
      )
      .toContain('/images/optimized/')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally {
    await deletePost(page, post.id)
  }
})

test('security page validates password confirmation and displays errors', async ({
  page,
}, testInfo) => {
  await login(page)
  await page.goto('/admin/security')
  await page.getByLabel('旧密码', { exact: true }).fill('incorrect-password')
  await page.getByLabel('新密码', { exact: true }).fill('Updated-Password-2026')
  await page.getByLabel('确认新密码').fill('Different-Password-2026')
  await page.getByRole('button', { name: '修改密码并退出登录' }).click()
  await expect(page.getByRole('alert')).toHaveText('两次输入的新密码不一致')
  await page.getByLabel('确认新密码').fill('Updated-Password-2026')
  await page.getByRole('button', { name: '修改密码并退出登录' }).click()
  await expect(page.getByRole('alert')).toHaveText('旧密码不正确')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('security-mobile.png'), fullPage: true })
})

test('batch image upload retries only failures and adds selected photos together', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/albums')
  await page.getByRole('button', { name: '上传 / 添加照片' }).click()
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  const stamp = Date.now()
  const ids: number[] = []
  let requestCount = 0
  await page.route('**/api/v1/admin/media', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    requestCount++
    if (requestCount === 2) {
      await route.fulfill({ status: 503, json: { message: '模拟临时失败' } })
      return
    }
    const response = await route.fetch()
    if (response.status() === 201) ids.push((await response.json()).data.id)
    await route.fulfill({ response })
  })
  try {
    await page.getByLabel('上传图片', { exact: true }).setInputFiles([
      { name: `batch-a-${stamp}.png`, mimeType: 'image/png', buffer: png },
      { name: `batch-b-${stamp}.png`, mimeType: 'image/png', buffer: png },
    ])
    await expect(page.locator('.media-library .form-success')).toContainText('失败 1 张')
    await page.getByRole('button', { name: '重试失败的 1 张图片' }).click()
    await expect(page.getByRole('button', { name: '重试失败的 1 张图片' })).toHaveCount(0)
    expect(requestCount).toBe(3)
    await page.getByLabel(`选择 batch-a-${stamp}.png`, { exact: true }).check()
    await page.getByLabel(`选择 batch-b-${stamp}.png`, { exact: true }).check()
    await page.getByRole('button', { name: '添加选中的图片' }).click()
    await expect(page.locator('.album-editor-photo')).toHaveCount(2)
  } finally {
    for (const id of ids)
      expect((await adminMutation(page, `/admin/media/${id}`, 'DELETE')).status()).toBe(200)
  }
})
