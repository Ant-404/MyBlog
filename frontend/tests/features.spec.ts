import { test, expect } from '@playwright/test'
import { login, adminMutation, createPost, deletePost } from './helpers/admin'
import { loginMember } from './helpers/member'

test('upload select cover/body and protect referenced images', async ({ page }) => {
  await login(page)
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/admin/media')
  await page.getByLabel('上传图片').setInputFiles({
    name: 'feature-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.locator('.media-item')).toContainText('feature-test.png')
  const files = (await (await page.request.get('/api/v1/admin/media')).json()).data
  const file = files.find(
    (item: { originalName: string }) => item.originalName === 'feature-test.png',
  )
  let postId: number | undefined
  try {
    expect((await page.request.get(file.url)).status()).toBe(200)
    await page.screenshot({ path: '../docs/screenshots/media-library.png', fullPage: true })
    await page.goto('/admin/posts/new')
    await page.getByLabel('文章标题', { exact: true }).fill('图片选择测试')
    await page.getByLabel('文章地址（slug）').fill(`media-feature-${Date.now()}`)
    await page.getByRole('button', { name: '上传 / 选择封面', exact: true }).click()
    await page
      .locator('.media-item')
      .filter({ hasText: 'feature-test.png' })
      .getByRole('button', { name: '选择图片' })
      .click()
    await expect(page.getByLabel('封面地址')).toHaveValue(file.url)
    await page.getByRole('button', { name: '上传 / 选择正文图片', exact: true }).click()
    await page
      .locator('.media-item')
      .filter({ hasText: 'feature-test.png' })
      .getByRole('button', { name: '选择图片' })
      .click()
    await expect(page.getByLabel('正文（Markdown）')).toContainText(file.url)
    await page.getByRole('button', { name: '保存草稿', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
    postId = Number(page.url().match(/posts\/(\d+)/)?.[1])
    await page.goto('/admin/media')
    await page
      .locator('.media-item')
      .filter({ hasText: 'feature-test.png' })
      .getByRole('button', { name: '删除图片' })
      .click()
    await expect(page.getByRole('alert')).toContainText('正在被内容使用')
  } finally {
    if (postId) await deletePost(page, postId)
    expect((await adminMutation(page, `/admin/media/${file.id}`, 'DELETE')).status()).toBe(200)
  }
  expect((await page.request.get(file.url)).status()).toBe(404)
})

test('taxonomy and friends management update real public APIs', async ({ page }) => {
  await login(page)
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/admin/taxonomy')
  const name = `FeatureCategory${Date.now()}`,
    renamed = `${name}Renamed`
  let categoryId: number | undefined, friendId: number | undefined
  try {
    await page.getByLabel('分类名称').fill(name)
    await page.getByRole('button', { name: '新增分类', exact: true }).click()
    await expect(page.locator('.management-list').first()).toContainText(name)
    categoryId = (
      await (await page.request.get('/api/v1/admin/taxonomy/categories')).json()
    ).data.find((row: { name: string }) => row.name === name).id
    await page.getByRole('button', { name: `重命名${name}`, exact: true }).click()
    await page.getByLabel('分类名称').fill(renamed)
    await page.getByRole('button', { name: '保存名称' }).click()
    await expect(page.locator('.management-list').first()).toContainText(renamed)
    await page.screenshot({ path: '../docs/screenshots/admin-taxonomy.png', fullPage: true })
    await page.getByRole('button', { name: `删除${renamed}`, exact: true }).click()
    await expect(page.getByRole('button', { name: `删除${renamed}`, exact: true })).toHaveCount(0)
    categoryId = undefined
    await page.goto('/admin/friends')
    await page.getByLabel('友链名称').fill('FeatureFriend')
    await page.getByLabel('简介', { exact: true }).fill('验证友链显隐')
    await page.getByLabel('网站地址').fill('https://example.com')
    await page.getByLabel('公开显示').uncheck()
    await page.getByRole('button', { name: '新增友链' }).click()
    await expect(page.locator('.management-list')).toContainText('FeatureFriend')
    friendId = (await (await page.request.get('/api/v1/admin/friends')).json()).data.find(
      (row: { name: string }) => row.name === 'FeatureFriend',
    ).id
    expect(
      JSON.stringify((await (await page.request.get('/api/v1/friends')).json()).data),
    ).not.toContain('FeatureFriend')
    await page.getByRole('button', { name: '编辑FeatureFriend' }).click()
    await page.getByLabel('公开显示').check()
    await page.getByRole('button', { name: '保存友链' }).click()
    await expect(page.locator('p[role="status"]')).toContainText('操作成功')
    expect(
      JSON.stringify((await (await page.request.get('/api/v1/friends')).json()).data),
    ).toContain('FeatureFriend')
  } finally {
    if (categoryId) {
      const item = (
        await (await page.request.get('/api/v1/admin/taxonomy/categories')).json()
      ).data.find((row: { id: number }) => row.id === categoryId)
      await adminMutation(
        page,
        `/admin/taxonomy/categories/${categoryId}?version=${item.version}`,
        'DELETE',
      )
    }
    if (friendId) {
      const item = (await (await page.request.get('/api/v1/admin/friends')).json()).data.find(
        (row: { id: number }) => row.id === friendId,
      )
      await adminMutation(page, `/admin/friends/${friendId}?version=${item.version}`, 'DELETE')
    }
  }
})

test('site settings update frontend and sanitize the about page', async ({ page }) => {
  await login(page)
  const original = (await (await page.request.get('/api/v1/admin/settings')).json()).data
  try {
    await page.goto('/admin/settings')
    await page.getByLabel('副标题', { exact: true }).fill('设置联调的临时副标题')
    await page
      .getByLabel('关于页面正文（Markdown）')
      .fill('## 设置生效\n<script>window.badAbout=true</script>\n新的关于正文。')
    await page.getByRole('button', { name: '保存站点设置' }).click()
    await expect(page.getByRole('status')).toContainText('操作成功')
    await page.screenshot({ path: '../docs/screenshots/admin-settings.png', fullPage: true })
    await page.getByRole('link', { name: '查看小站' }).click()
    await expect(page.locator('.hero p')).toHaveText('设置联调的临时副标题')
    await page.goto('/about')
    await expect(page.locator('.prose')).toContainText('新的关于正文')
    await expect(page.locator('.prose script')).toHaveCount(0)
    expect(await page.evaluate(() => 'badAbout' in window)).toBe(false)
  } finally {
    const current = (await (await page.request.get('/api/v1/admin/settings')).json()).data
    expect(
      (
        await adminMutation(page, '/admin/settings', 'PUT', {
          ...original,
          version: current.version,
        })
      ).status(),
    ).toBe(200)
  }
})

test('reading tools comments moderation feeds and statistics work together', async ({ page }) => {
  await login(page)
  const post = await createPost(page)
  try {
    await page.goto(`/posts/${post.slug}`)
    await expect(page.getByRole('navigation', { name: '文章目录' })).toContainText('第一节')
    await expect(page.locator('#article-content .hljs-keyword').first()).toHaveText('class')
    await expect(
      page.getByRole('navigation', { name: '相邻文章' }).getByRole('link').first(),
    ).toBeVisible()
    await page
      .getByRole('navigation', { name: '文章目录' })
      .getByRole('link', { name: '第二节' })
      .click()
    await expect(page).toHaveURL(/#article-heading-2$/)
    await loginMember(page)
    await page.reload()
    await page.getByLabel('评论内容').fill('<script>window.badComment=true</script>文字评论')
    await page.getByRole('button', { name: '提交评论', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('审核通过后')
    expect(
      (await (await page.request.get(`/api/v1/posts/${post.slug}/comments`)).json()).data.total,
    ).toBe(0)
    await login(page)
    await page.goto('/admin/comments')
    const row = page.locator('.comment-list article').filter({ hasText: 'FeatureComment' })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: '通过', exact: true }).click()
    await expect(row).toHaveCount(0)
    await page.goto(`/posts/${post.slug}`)
    await expect(page.locator('.comment-list')).toContainText('window.badComment=true')
    expect(await page.evaluate(() => 'badComment' in window)).toBe(false)
    await page.locator('.post-comments').scrollIntoViewIfNeeded()
    await expect
      .poll(async () =>
        Number(
          await page
            .getByRole('progressbar', { name: '正文阅读进度' })
            .getAttribute('aria-valuenow'),
        ),
      )
      .toBeGreaterThan(0)
    await page.screenshot({ path: '../docs/screenshots/article-reading.png', fullPage: true })
    for (const path of ['/rss.xml', '/sitemap.xml']) {
      const response = await page.request.get(path)
      expect(response.status()).toBe(200)
      expect(await response.text()).toContain(post.slug)
    }
    await page.goto('/admin/statistics')
    await expect(page.getByRole('heading', { name: '阅读统计.' })).toBeVisible()
    await expect(page.locator('.management-list')).toContainText(post.title)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: '../docs/screenshots/admin-statistics-mobile.png',
      fullPage: true,
    })
  } finally {
    await deletePost(page, post.id)
  }
})
